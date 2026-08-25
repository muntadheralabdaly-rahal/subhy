import { Translate } from "@phosphor-icons/react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LANGS, useI18n } from "@/lib/i18n";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const { lang, setLang } = useI18n();
  const current = LANGS.find((l) => l.code === lang);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors",
          tone === "dark"
            ? "glass text-white hover:bg-white/20"
            : "border border-hairline bg-white text-brand hover:bg-surface-light",
        )}
      >
        <Translate className="h-5 w-5" />
        {current?.label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-2xl">
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onSelect={() => {
              setLang(l.code);
              track("language_changed", { lang: l.code });
            }}
            className="rounded-xl text-base font-medium"
          >
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
