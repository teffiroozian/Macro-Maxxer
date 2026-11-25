import { CutleryIcon, StorefrontIcon } from "@/components/icons/SearchScopeIcons";

const ROWS = [
  { title: "Restaurants", detail: "Open a full menu by name", Icon: StorefrontIcon },
  { title: "Menu items", detail: "Compare macros across every restaurant", Icon: CutleryIcon },
];

export default function NativeSearchGuide() {
  return (
    <ul className="flex flex-col gap-5 px-1 pt-4" aria-label="What you can search for">
      {ROWS.map(({ title, detail, Icon }) => (
        <li key={title} className="flex items-center gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong"><Icon className="size-[21px]" /></span>
          <span>
            <span className="block text-base font-bold leading-[21px]">{title}</span>
            <span className="block text-[15px] leading-5 text-slate-600 dark:text-slate-300">{detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
