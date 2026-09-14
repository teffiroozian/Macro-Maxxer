"""Replay explicitly observed official US Starbucks JSON URLs; no importer or browser credentials.
Usage: python3 scripts/collect/starbucks-interactive-sources.py
Edit the capture plan only with URLs observed in the official browser experience.
"""
import datetime
import hashlib
import json
import pathlib
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
AREA = ROOT / 'data/research/starbucks/captures/interactive'
PLAN = AREA / 'capture-plan.json'

def main():
    for entry in json.loads(PLAN.read_text()):
        destination = AREA / entry['file']
        if destination.exists():
            continue  # Preserve the original snapshot; remove explicitly to recapture.
        url = entry['url']
        parsed = urllib.parse.urlsplit(url)
        if parsed.scheme != 'https' or parsed.netloc != 'www.starbucks.com' or not parsed.path.startswith('/apiproxy/'):
            raise ValueError('Only observed official Starbucks apiproxy URLs are allowed')
        if set(urllib.parse.parse_qs(parsed.query)) - {'storeNumber', 'storeId', 'ownershipTypeCode', 'timeZone'}:
            raise ValueError('Review additional query parameters before preserving them')
        if not destination.resolve().is_relative_to(AREA.resolve()):
            raise ValueError('Invalid output path')
        metadata = {
            'restaurant': 'Starbucks', 'sourceType': 'official-dynamic-json-replay',
            'source': url, 'requestMethod': 'GET', 'queryParameters': urllib.parse.parse_qs(parsed.query),
            'retrieved': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'region': 'US',
            'requestHeaders': {'Accept': 'application/json'},
            'authentication': 'No cookies, credentials, authorization headers or browser session transferred',
            'store': entry.get('store'), 'discovery': entry['discovery'],
            'captureMethod': 'Direct unauthenticated GET replay of URL observed in real-browser resource inventory; not a HAR/body export from the original browser request',
        }
        destination.parent.mkdir(parents=True, exist_ok=True)
        try:
            request = urllib.request.Request(url, headers={'Accept': 'application/json'})
            with urllib.request.urlopen(request, timeout=40) as response:
                body = response.read()
                value = json.loads(body)
                def sensitive(value):
                    if isinstance(value, dict):
                        for key, item in value.items():
                            if key.lower() in {'accesstoken','refreshtoken','idtoken','password','authorization','cookie','set-cookie','email','phone','sessionid'} and item:
                                raise ValueError('Potential sensitive field; response not saved: ' + key)
                            sensitive(item)
                    elif isinstance(value, list):
                        for item in value: sensitive(item)
                sensitive(value)
                destination.write_bytes(body)
                metadata.update(httpStatus=response.status, finalUrl=response.url,
                    contentType=response.headers.get('Content-Type'),
                    localPath=str(destination.relative_to(ROOT)), bytes=len(body),
                    sha256=hashlib.sha256(body).hexdigest(), reusableWithoutBrowserSession=True)
        except (urllib.error.URLError, ValueError) as error:
            metadata.update(error=str(error), localPath=None)
        destination.with_name(destination.stem + '-source.json').write_text(json.dumps(metadata, indent=2) + '\n')
        print(entry['file'], metadata.get('httpStatus', metadata.get('error')), metadata.get('bytes', 0))

if __name__ == '__main__': main()
