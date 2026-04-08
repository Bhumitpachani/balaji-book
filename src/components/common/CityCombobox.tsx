import React, { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type CityComboboxProps = {
  id?: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  allowAll?: boolean;
  allLabel?: string;
};

export const CityCombobox: React.FC<CityComboboxProps> = ({
  id,
  value,
  options,
  onChange,
  placeholder = "Select city",
  disabled = false,
  allowAll = false,
  allLabel = "All cities"
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const normalizedOptions = useMemo(() => {
    const unique = new Set(
      options
        .map(option => option.trim())
        .filter(Boolean)
    );
    if (value?.trim()) {
      unique.add(value.trim());
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [options, value]);

  const trimmedQuery = query.trim();
  const hasCustomOption = trimmedQuery.length > 0
    && !normalizedOptions.some(option => option.toLowerCase() === trimmedQuery.toLowerCase());

  React.useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !value && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width]">
        <Command>
          <CommandInput
            placeholder="Search city..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No cities found.</CommandEmpty>
            <CommandGroup>
              {allowAll && (
                <CommandItem
                  value=""
                  onSelect={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      !value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {allLabel}
                </CommandItem>
              )}
              {hasCustomOption && (
                <CommandItem
                  value={trimmedQuery}
                  onSelect={() => {
                    onChange(trimmedQuery);
                    setOpen(false);
                  }}
                >
                  Use "{trimmedQuery}"
                </CommandItem>
              )}
              {normalizedOptions.map(option => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value?.toLowerCase() === option.toLowerCase() ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
