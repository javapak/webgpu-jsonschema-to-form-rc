import { useEffect, useState } from "react";
import type ObjectSelectorProps from "../types/ObjectSelectorProps";
import { Divider, ActionIcon, Button, Code, NativeSelect, Group, TextInput } from "@mantine/core";
import { Plus } from "@ricons/tabler";

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
  const [availableItems, setAvailableItems] = useState<Array<{
    id: string;
    label: string;
    data: object;
  }>>();
  const [selectedItem, setSelectedItem] = useState<Record<string, {}> | undefined>();


  useEffect(() => {
    setSelectedItem(availableItems?.find(item => 
      value && typeof value === 'object' && 
      JSON.stringify(item.data) === JSON.stringify(value)
    ))
  }, [onChange, setSelectedItem]);


  useEffect(() => {
    if (dataSource && dataSource[objectType]) {
      setAvailableItems(dataSource[objectType]);
    }

  }, [dataSource, setAvailableItems]);

  return (
    <div>
      <Group>
        
        {availableItems?.length && availableItems.length > 0 ? (

        <>
        <NativeSelect 
          title={`Use existing ${objectType} reference`}
          classNames={{root: 'SelectRoot', wrapper: 'SelectWrapper' }}
          content=""
          label={field.name}
          data={availableItems?.map((item) => ` ${field.name} - ${item.id}`)}
          w='250px'
          onChange={(e) => onChange(field.name, e.currentTarget.value)}
        />
        <Divider size="xs" orientation="vertical"/>
        </>
        
        ): <>
        <TextInput w='250px' error disabled placeholder={`No ${objectType} instances to reference. `}/>
          <Divider size="xs" orientation="vertical" />
        </>
        }
          
            <ActionIcon
              variant="subtle"
              type="button"
              onClick={() => onCreateNew(field)}
              title={`Create new ${objectType}`}
            >

                <Plus width={'70%'} />

            </ActionIcon>
      </Group>

      {selectedItem && (
        <div>
          <Code>
            {JSON.stringify(selectedItem.data, null, 2)}
          </Code>
        </div>
      )}
    </div>
  );
};

export default ObjectSelector;