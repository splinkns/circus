import React from 'react';
import { Tabs, Tab } from 'components/react-bootstrap';
import ConditionEditor from '@smikitky/rb-components/lib/ConditionEditor';
import PropertyEditor from '@smikitky/rb-components/lib/PropertyEditor';

export interface Condition {
  type: 'basic' | 'advanced';
  basic: any;
  advanced: any;
}

const ConditionFrame: <T extends Condition>(props: {
  condition: T;
  onChange: (value: T) => void;
  basicConditionProperties: any;
  advancedConditionKeys: any;
}) => React.ReactElement<any> = props => {
  const {
    basicConditionProperties,
    advancedConditionKeys,
    condition,
    onChange
  } = props;

  const handleChangeType = (key: number) => {
    const type = key === 1 ? 'basic' : 'advanced';
    onChange({ ...condition, type });
  };

  const handleBasicFilterChange = (basicCondition: any) => {
    onChange({ ...condition, basic: basicCondition });
  };

  const handleAdvancedFilterChange = (advancedCondition: any) => {
    onChange({ ...condition, advanced: advancedCondition });
  };

  const activeKey = condition.type === 'advanced' ? 2 : 1;

  return (
    <div>
      <Tabs
        animation={false}
        id="search-condition-tabs"
        activeKey={activeKey}
        onSelect={handleChangeType}
      >
        <Tab eventKey={1} title="Basic">
          <PropertyEditor
            className="condition-basic-filter"
            properties={basicConditionProperties}
            value={condition.basic}
            onChange={handleBasicFilterChange}
          />
        </Tab>
        <Tab eventKey={2} title="Advanced">
          <ConditionEditor
            keys={advancedConditionKeys}
            value={condition.advanced}
            onChange={handleAdvancedFilterChange}
          />
        </Tab>
      </Tabs>
    </div>
  );
};

export default ConditionFrame;