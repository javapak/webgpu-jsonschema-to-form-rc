import { useState } from "react";
import type ObjectSelectorProps from "../types/ObjectSelectorProps";
import type ProcessedField from "../types/ProcessedField";
import { ActionIcon, Button } from "@mantine/core";
import { ChevronDown, Plus } from "@ricons/tabler";

const ObjectSelector: React.FC<ObjectSelectorProps> = ({ 
  field, 
  value, 
  onChange, 
  dataSource, 
  onCreateNew, 
  error 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const objectType = field.schema?.title || field.name.split('.').pop() || 'object';
  const availableItems = dataSource[objectType] || [];

  const selectedItem = availableItems.find(item => 
    value && typeof value === 'object' && 
    JSON.stringify(item.data) === JSON.stringify(value)
  );

  return (
    <div>
      <div>
        <div>
            <span>
              {selectedItem ? selectedItem.label : `Select ${objectType}...`}
            </span>
          <div className="ButtonGroup">
          <ActionIcon
            variant="subtle"
            type="button"
            title={`Expand and select ${objectType}`}
            onClick={() => setIsOpen(!isOpen)}
          >
            <ChevronDown width={'70%'} />
          </ActionIcon>
          </div>

          {isOpen && (
            <div>
              {availableItems.length === 0 ? (
                <div>
                  No {objectType} items available. Create one using the + Button.
                </div>
              ) : (
                availableItems.map((item) => (
                  <Button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onChange(field.name, item.data);
                      setIsOpen(false);
                    }}
          
                  >
                    <div>{item.label}</div>
                    <div>
                      {JSON.stringify(item.data).substring(0, 60)}...
                    </div>
                  </Button>
                ))
              )}
            </div>
          )}
        </div>
        <div className="ButtonGroup">
          <ActionIcon
            variant="subtle"
            type="button"
            onClick={() => onCreateNew(field)}
            title={`Create new ${objectType}`}
          >
            <Plus width={'70%'} />
          </ActionIcon>
        </div>
      </div>

      {selectedItem && (
        <div>
          <div>
            -
            <span>Selected: {selectedItem.label}</span>
          </div>
          <pre>
            {JSON.stringify(selectedItem.data)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ObjectSelector;