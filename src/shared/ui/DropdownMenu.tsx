import { Dropdown, Label } from '@heroui/react';
import { EllipsisVertical } from '@gravity-ui/icons';

export type DropdownMenuItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'danger';
};

type DropdownMenuProps = {
  items: DropdownMenuItem[];
  onAction: (id: string) => void;
  triggerClassName?: string;
};

export function DropdownMenu({ items = [], onAction, triggerClassName }: DropdownMenuProps) {
  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label="Menu"
        className={
          triggerClassName ??
          'button button-sm button--icon-only data-[focus-visible=true]:status-focused bg-transparent border-none shadow-none'
        }
      >
        <EllipsisVertical className="size-4 outline-none text-gray-400" />
      </Dropdown.Trigger>
      <Dropdown.Popover>
        <Dropdown.Menu onAction={(key) => onAction(String(key))}>
          <Dropdown.Section>
            {items.map((item) => (
              <Dropdown.Item
                key={item.id}
                id={item.id}
                textValue={item.label}
                variant={item.variant === 'danger' ? 'danger' : undefined}
              >
                <div className="flex items-center gap-2">
                  {item.icon && (
                    <span className={item.variant === 'danger' ? 'text-danger' : 'text-muted'}>
                      {item.icon}
                    </span>
                  )}
                  <Label className={item.variant === 'danger' ? 'text-danger' : undefined}>
                    {item.label}
                  </Label>
                </div>
              </Dropdown.Item>
            ))}
          </Dropdown.Section>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
