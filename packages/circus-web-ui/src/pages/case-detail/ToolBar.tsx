import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';
import { InterpolationMode } from '@utrad-ical/circus-rs/src/browser/ViewState';
import Icon from 'components/Icon';
import {
  Button,
  Dropdown,
  MenuItem,
  OverlayTrigger,
  Tooltip,
  SplitButton
} from 'components/react-bootstrap';
import React from 'react';
import styled from 'styled-components';
import { Layout } from './ViewerCluster';
import { WindowPreset } from 'types/Project';
import useKeyboardShortcut from 'utils/useKeyboardShortcut';

export interface ViewOptions {
  layout?: Layout;
  showReferenceLine?: boolean;
  showScrollbar?: boolean;
  interpolationMode?: InterpolationMode;
}

const layoutOptions = [
  { key: 'twoByTwo', caption: '2 x 2', icon: 'circus-layout-four' },
  { key: 'axial', caption: 'Axial', icon: 'circus-orientation-axial' },
  { key: 'sagittal', caption: 'Sagittal', icon: 'circus-orientation-sagittal' },
  { key: 'coronal', caption: 'Coronal', icon: 'circus-orientation-coronal' }
];

const ToolBar: React.FC<{
  active: string;
  viewOptions: ViewOptions;
  onChangeViewOptions: (viewOptions: ViewOptions) => void;
  brushEnabled: boolean;
  lineWidth: number;
  setLineWidth: (lineWidth: number) => void;
  windowPresets?: WindowPreset[];
  onChangeTool: (toolName: string) => void;
  onApplyWindow: (window: any) => void;
  disabled?: boolean;
}> = React.memo(props => {
  const {
    active,
    viewOptions,
    onChangeViewOptions,
    brushEnabled,
    lineWidth,
    setLineWidth,
    windowPresets = [],
    onChangeTool,
    onApplyWindow,
    disabled
  } = props;

  const widthOptions = ['1', '3', '5', '7'];

  const handleToggleReferenceLine = () => {
    onChangeViewOptions({
      ...viewOptions,
      showReferenceLine: !viewOptions.showReferenceLine
    });
  };

  const handleToggleScrollbar = () => {
    onChangeViewOptions({
      ...viewOptions,
      showScrollbar: !viewOptions.showScrollbar
    });
  };

  const handleChangeLayout = (selection: Layout) => {
    onChangeViewOptions({ ...viewOptions, layout: selection });
  };

  const handleToggleInterpolationMode = () => {
    onChangeViewOptions({
      ...viewOptions,
      interpolationMode:
        viewOptions.interpolationMode === 'trilinear'
          ? 'nearestNeighbor'
          : 'trilinear'
    });
  };

  const handleApplyWindow = async (selection: WindowPreset) => {
    if ('level' in selection && 'width' in selection) {
      onApplyWindow({ level: selection.level, width: selection.width });
    } else {
      const value = await prompt('Input window level/width (e.g., "20,100")');
      const [level, width] = (value ? value : '0,0')
        .split(/,|\//)
        .map(s => parseInt(s, 10));
      if (width <= 0 || isNaN(level) || isNaN(width)) return;
      onApplyWindow({ level, width });
    }
  };

  const brushTools = ['brush', 'eraser', 'bucket'];
  const activeTool =
    !brushEnabled && brushTools.some(tool => tool === active)
      ? 'pager'
      : active;

  return (
    <StyledDiv>
      <ToolButton
        name="pager"
        icon="rs-pager"
        changeTool={onChangeTool}
        active={activeTool}
        shortcut="KeyP"
        disabled={disabled}
      />
      <ToolButton
        name="zoom"
        icon="rs-zoom"
        changeTool={onChangeTool}
        active={activeTool}
        shortcut="KeyZ"
        disabled={disabled}
      />
      <ToolButton
        name="hand"
        icon="rs-hand"
        changeTool={onChangeTool}
        active={activeTool}
        shortcut="KeyH"
        disabled={disabled}
      />
      <ToolButton
        name="window"
        icon="rs-window"
        changeTool={onChangeTool}
        active={activeTool}
        shortcut="KeyW"
        disabled={disabled}
      >
        {windowPresets.map((p: WindowPreset, i) => (
          <MenuItem
            key={i + 1}
            eventKey={i + 1}
            onClick={() => handleApplyWindow(p)}
          >
            <b>{p.label}</b> {`(L: ${p.level} / W: ${p.width})`}
          </MenuItem>
        ))}
        <MenuItem key={99999} eventKey={99999} onClick={handleApplyWindow}>
          Manual
        </MenuItem>
      </ToolButton>
      &thinsp;
      <ToolButton
        name="brush"
        icon="rs-brush"
        changeTool={onChangeTool}
        active={activeTool}
        shortcut="KeyB"
        disabled={!brushEnabled || disabled}
      />
      <ToolButton
        name="eraser"
        icon="rs-eraser"
        changeTool={onChangeTool}
        active={activeTool}
        shortcut="KeyE"
        disabled={!brushEnabled || disabled}
      />
      <ShrinkSelect
        numericalValue
        className="line-width-shrinkselect"
        options={widthOptions}
        value={lineWidth}
        onChange={setLineWidth}
        disabled={!brushEnabled || disabled}
      />
      <ToolButton
        name="bucket"
        icon="rs-bucket"
        changeTool={onChangeTool}
        active={activeTool}
        disabled={!brushEnabled || disabled}
      />
      &thinsp;
      <Dropdown id="layout-dropdown" disabled={disabled}>
        <Dropdown.Toggle>
          <Icon
            icon={layoutOptions.find(l => l.key === viewOptions.layout)?.icon}
          />
        </Dropdown.Toggle>
        <Dropdown.Menu>
          {layoutOptions.map(l => {
            return (
              <MenuItem
                key={l.key}
                eventKey={l.key}
                onSelect={handleChangeLayout}
              >
                <CheckMark checked={viewOptions.layout === l.key} />
                <Icon icon={l.icon} />
                {l.caption}
              </MenuItem>
            );
          })}
        </Dropdown.Menu>
      </Dropdown>
      &thinsp;
      <Dropdown id="view-options-dropdown" disabled={disabled}>
        <Dropdown.Toggle>
          <Icon icon="circus-tool" />
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <MenuItem onClick={handleToggleReferenceLine}>
            <CheckMark checked={!!viewOptions.showReferenceLine} />
            Show reference line
          </MenuItem>
          <MenuItem onClick={handleToggleScrollbar}>
            <CheckMark checked={!!viewOptions.showScrollbar} />
            Show scrollbar
          </MenuItem>
          <MenuItem onClick={handleToggleInterpolationMode}>
            <CheckMark
              checked={viewOptions.interpolationMode === 'trilinear'}
            />
            Trilinear filtering
          </MenuItem>
        </Dropdown.Menu>
      </Dropdown>
    </StyledDiv>
  );
});

const StyledDiv = styled.div`
  flex: none;
  background-color: #333;
  button {
    height: 40px;
    padding: 0 7px;
    font-size: 170%;
  }
  .line-width-shrinkselect > button {
    font-size: 100%;
  }
  .layout-shrinkselect .dropdown-toggle .caption {
    display: none;
  }
  .checkmark {
    display: inline-block;
    width: 25px;
  }
`;

export default ToolBar;

const CheckMark: React.FC<{ checked: boolean }> = props => (
  <span className="checkmark">
    {props.checked && <Icon icon="glyphicon-ok" />}
  </span>
);

const ToolButton: React.FC<{
  name: string;
  icon: string;
  active: string;
  changeTool: any;
  shortcut?: string;
  disabled?: boolean;
}> = props => {
  const {
    name,
    icon,
    active,
    changeTool,
    disabled,
    shortcut,
    children
  } = props;

  const handleClick = () => !disabled && changeTool(name);
  useKeyboardShortcut(shortcut, handleClick);

  const style = active === name ? 'primary' : 'default';
  const iconSpan = <Icon icon={icon} />;
  const toolTip = (
    <Tooltip id="case-detail-toolbar-tooltip">
      {name[0].toUpperCase() +
        name.slice(1) +
        (shortcut ? ' (' + shortcut[3] + ')' : '')}
    </Tooltip>
  );

  if (children) {
    return (
      <OverlayTrigger overlay={toolTip} placement="top" delayShow={200}>
        <SplitButton
          id={`toolbutton-${name}`}
          title={iconSpan}
          bsStyle={style}
          onClick={handleClick}
          disabled={disabled}
        >
          {children}
        </SplitButton>
      </OverlayTrigger>
    );
  } else {
    return (
      <OverlayTrigger overlay={toolTip} placement="top" delayShow={200}>
        <Button bsStyle={style} onClick={handleClick} disabled={disabled}>
          {iconSpan}
        </Button>
      </OverlayTrigger>
    );
  }
};
