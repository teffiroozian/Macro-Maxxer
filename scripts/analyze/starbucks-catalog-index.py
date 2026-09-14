"""Validate and summarize the consolidated national Starbucks snapshot."""
import json, pathlib
ROOT=pathlib.Path(__file__).resolve().parents[2]
CATALOG=ROOT/'data/raw/starbucks/menu.json'
def nutrition(n):
    found={}
    def walk(v):
        if isinstance(v,dict):
            if v.get('id') in ['totalFat','totalCarbs','sugars','protein']: found[{'totalFat':'fat','totalCarbs':'carbs','sugars':'sugar','protein':'protein'}[v['id']]]=v.get('value')
            for x in v.values():walk(x)
        elif isinstance(v,list):
            for x in v:walk(x)
    walk(n)
    return {'calories':(n or {}).get('calories',{}).get('displayValue'),**{k:found.get(k) for k in ['carbs','fat','sugar','protein']}}
def main():
    catalog=json.loads(CATALOG.read_text())
    pairs={(r['productNumber'],r['form']) for r in catalog['responses']}
    matching=0;sizes=0;recipes=0;option_groups=0;option_products=0
    for r in catalog['responses']:
        matches=[p for p in r['response'].get('products',[]) if p.get('productNumber')==r['productNumber'] and p.get('formCode','').lower()==r['form']]
        if not matches: raise ValueError(f"missing matching product for {r['productNumber']}-{r['form']}")
        matching+=1
        for p in matches:
            sizes+=len(p.get('sizes',[]))
            recipes+=sum(bool((s.get('recipe') or {}).get('default')) for s in p.get('sizes',[]))
            stack=list(p.get('productOptions',[]))
            while stack:
                group=stack.pop();option_groups+=1;option_products+=len(group.get('products',[]));stack.extend(group.get('children',[]))
    summary={'responses':len(catalog['responses']),'uniqueProductForms':len(pairs),'matchingResponses':matching,'sizes':sizes,'sizesWithDefaultRecipes':recipes,'customizationGroups':option_groups,'customizationProducts':option_products,'failures':len(catalog.get('failures',[]))}
    if summary['responses'] != catalog['totalProductFormPairs'] or summary['failures']:
        raise ValueError(f"incomplete catalog: {summary}")
    print(json.dumps(summary,indent=2))
if __name__=='__main__':main()
