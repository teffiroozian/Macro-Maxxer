"""Sequential, resumable US Starbucks menu collection.

The single output embeds both the category/menu snapshot and every product detail
response. Existing successful responses are preserved, requests are spaced by 10
seconds, and collection stops at the first access block.
"""
import datetime
import hashlib
import json
import pathlib
import time
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'data/raw/starbucks/menu.json'
DELAY_SECONDS = 10

def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

def pairs(menu):
    found = {}
    def walk(nodes):
        for node in nodes:
            for p in node.get('products', []):
                key = (p['productNumber'], p['formCode'].lower())
                found[key] = {'productNumber': key[0], 'form': key[1]}
            walk(node.get('children', []))
    walk(menu['menus'])
    return list(found.values())

def main():
    catalog = json.loads(OUT.read_text())
    menu = catalog['menu']
    targets = pairs(menu)
    catalog['menuSha256'] = hashlib.sha256(
        json.dumps(menu, ensure_ascii=False, separators=(',', ':')).encode()
    ).hexdigest()
    catalog['totalProductFormPairs'] = len(targets)
    saved = {(r['productNumber'], r['form']) for r in catalog['responses']}
    run = {'startedAt': now(), 'attempted': 0, 'successful': 0, 'failed': 0,
           'previouslyCollected': len(saved), 'blocked': False}
    catalog['lastRun'] = run
    def save():
        catalog['updatedAt'] = now()
        catalog['successful'] = len(catalog['responses'])
        OUT.write_text(json.dumps(catalog, ensure_ascii=False, separators=(',', ':')) + '\n')
    save()
    for p in targets:
        key = (p['productNumber'], p['form'])
        if key in saved:
            continue
        time.sleep(DELAY_SECONDS)
        url = f"https://www.starbucks.com/apiproxy/v1/ordering/{key[0]}/{key[1]}"
        run['attempted'] += 1
        status = None
        error = None
        try:
            request = urllib.request.Request(url, headers={'Accept': 'application/json'})
            with urllib.request.urlopen(request, timeout=45) as response:
                status = response.status
                body = response.read()
            if b'access denied' in body.lower() or b'captcha' in body.lower():
                run['blocked'] = True
                raise ValueError('Access blocked')
            value = json.loads(body)
            if not any(x.get('productNumber') == key[0] and x.get('formCode', '').lower() == key[1]
                       for x in value.get('products', [])):
                raise ValueError('Response has no matching product/form')
            catalog['responses'].append({**p, 'retrievedAt': now(), 'response': value})
            saved.add(key)
            run['successful'] += 1
            catalog['failures'] = [f for f in catalog['failures']
                                   if (f['productNumber'], f['form']) != key]
        except urllib.error.HTTPError as exc:
            status = exc.code
            error = f'HTTP {status}'
            run['blocked'] = status in (401, 403, 429)
            exc.close()
        except (urllib.error.URLError, TimeoutError, ValueError) as exc:
            error = str(exc)[:160]
        if error:
            run['failed'] += 1
            catalog['failures'] = [f for f in catalog['failures']
                                   if (f['productNumber'], f['form']) != key]
            catalog['failures'].append({**p, 'httpStatus': status, 'error': error, 'at': now()})
        save()
        print(json.dumps(run), flush=True)
        if run['blocked']:
            break
    run['finishedAt'] = now()
    save()
    print(json.dumps({'lastRun': run, 'totalSuccessful': len(saved)}), flush=True)

if __name__ == '__main__':
    main()
