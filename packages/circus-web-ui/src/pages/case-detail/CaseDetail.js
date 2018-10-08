import React from 'react';
import { api } from '../../utils/api';
import ViewerCluster from './ViwewerCluster';
import PropertyEditor from 'rb/PropertyEditor';
import FullSpanContainer from 'components/FullSpanContainer';
import LoadingIndicator from 'rb/LoadingIndicator';
import {
  Button,
  Glyphicon,
  SplitButton,
  MenuItem
} from '../../components/react-bootstrap';
import LabelSelector from './LabelSelector';
import { store } from 'store';
import * as rs from 'circus-rs';
import { alert, prompt, confirm } from 'rb/modal';
import ShrinkSelect from 'rb/ShrinkSelect';
import merge from 'merge';
import classNames from 'classnames';
import EventEmitter from 'events';
import { sha1 } from '../../utils/util.js';
import ProjectDisplay from 'components/ProjectDisplay';
import Collapser from '../../components/Collapser';
import RevisionSelector from './RevisionSelector';
import attributeSchemaToProperties from './attributeSchemaToProperties';
import PatientInfoBox from 'components/PatientInfoBox';
import TimeDisplay from 'components/TimeDisplay';
import Tag from 'components/Tag';
import { connect } from 'react-redux';

class CaseDetailView extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      busy: false,
      projectData: null,
      caseData: null,
      editingRevisionIndex: -1,
      editingData: null
    };
  }

  selectRevision = async index => {
    const { revisions } = this.state.caseData;
    const revision = revisions[index];
    this.setState({ busy: true, editingRevisionIndex: index });

    const data = merge(true, {}, revision);
    delete data.date;
    delete data.creator;

    // Load all label volume data in the latest revision
    for (const series of data.series) {
      for (const label of series.labels) {
        if (label.type !== 'voxel') continue;
        const cloud = new rs.VoxelCloud();
        cloud.volume = new rs.RawData([8, 8, 8], rs.PixelFormat.Binary);
        cloud.origin = [0, 0, 0];
        if (label.data.voxels !== null) {
          try {
            const buffer = await api('blob/' + label.data.voxels, {
              handleErrors: true,
              responseType: 'arraybuffer'
            });
            const volume = new rs.RawData(
              label.data.size,
              rs.PixelFormat.Binary
            );
            volume.assign(buffer);
            cloud.volume = volume;
            cloud.origin = label.data.origin;
          } catch (err) {
            await alert('Could not load label volume data: \n' + err.message);
            label.data.cloud = null;
          }
        }
        cloud.color = label.data.color || '#ff0000';
        cloud.alpha = 'alpha' in label.data ? parseFloat(label.data.alpha) : 1;
        // cloud.debugPoint = true;
        label.cloud = cloud;
        // console.log('Cloud loaded', cloud);
      }
    }

    this.setState({ editingData: data, busy: false });
  };

  async loadCase() {
    const caseId = this.props.match.params.caseId;
    const caseData = await api('cases/' + caseId);
    const project = this.props.accessibleProjects.find(
      p => p.projectId === caseData.projectId
    );
    this.setState({ caseData, projectData: project.project }, () => {
      this.selectRevision(caseData.revisions.length - 1);
    });
  }

  saveRevision = async () => {
    const data = this.state.editingData;

    const desc = await prompt('Revision message', data.description);
    if (desc === null) return;
    data.description = desc;

    // save all label volume data
    for (const series of data.series) {
      for (const label of series.labels) {
        try {
          label.cloud.shrinkToMinimum();
          const bb = rs.scanBoundingBox(label.cloud.volume);
          const newLabelData = {
            voxels: null,
            color: label.cloud.color,
            alpha: label.cloud.alpha
          };
          if (bb !== null) {
            // save painted voxels
            const voxels = label.cloud.volume.data;
            const hash = sha1(voxels);
            if (hash === label.data.voxels) {
              // console.log('Skipping unchanged voxel data.');
            } else {
              // needs to save the new voxel data.
              await api('blob/' + hash, {
                method: 'put',
                handleErrors: true,
                data: voxels,
                headers: { 'Content-Type': 'application/octet-stream' }
              });
            }
            newLabelData.voxels = hash;
            newLabelData.origin = label.cloud.origin;
            newLabelData.size = label.cloud.volume.getDimension();
          }
          label.data = newLabelData;
          delete label.cloud;
        } catch (err) {
          await alert('Could not save label volume data: \n' + err.message);
          return;
        }
      }
    }

    // prepare revision data
    data.status = 'approved';
    const caseId = this.state.caseData.caseId;
    try {
      await api(`cases/${caseId}/revision`, {
        method: 'post',
        data,
        handleErrors: true
      });
      await alert('Successfully registered a revision.');
      this.setState({ caseData: null, editingData: null });
      this.loadCase();
    } catch (err) {
      await alert('Error: ' + err.message);
    }
  };

  revertRevision = async () => {
    if (!await confirm('Reload the current revision?')) {
      return;
    }
    this.selectRevision(this.state.editingRevisionIndex);
  };

  revisionDataChange = revision => {
    this.setState({ editingData: revision });
  };

  async componentDidMount() {
    await this.loadCase();
  }

  render() {
    if (
      !this.state.caseData ||
      !this.state.projectData ||
      !this.state.editingData
    ) {
      return <LoadingIndicator />;
    }

    const { projectData: prj, caseData } = this.state;

    const caseId = this.props.match.params.caseId;

    return (
      <FullSpanContainer>
        <Collapser title="Case Info" className="case-info">
          <ProjectDisplay projectId={prj.projectId} withName size="xl" />
          <PatientInfoBox value={caseData.patientInfoCache} />
          <div className="tag-list">
            {caseData.tags.map(t => (
              <Tag projectId={prj.projectId} tag={t} key={t} />
            ))}
          </div>
          <div>
            Case: {caseId}
            <br />
            (Create: <TimeDisplay value={caseData.createdAt} />)
          </div>
        </Collapser>
        <MenuBar
          onSaveClick={this.saveRevision}
          onRevertClick={this.revertRevision}
          onRevisionSelect={this.selectRevision}
          revisions={this.state.caseData.revisions}
          currentRevision={this.state.editingRevisionIndex}
        />
        <RevisionData
          busy={this.state.busy}
          revision={this.state.editingData}
          projectData={this.state.projectData}
          onChange={this.revisionDataChange}
        />
      </FullSpanContainer>
    );
  }
}

const CaseDetail = connect(state => ({
  accessibleProjects: state.loginUser.data.accessibleProjects
}))(CaseDetailView);
export default CaseDetail;

const MenuBar = props => {
  const {
    onRevertClick,
    onSaveClick,
    revisions,
    onRevisionSelect,
    currentRevision
  } = props;
  return (
    <div className="case-detail-menu">
      <div className="left">
        Revision:&ensp;
        <RevisionSelector
          revisions={revisions}
          selected={currentRevision}
          onSelect={onRevisionSelect}
        />
      </div>
      <div className="right">
        <Button bsStyle="warning" onClick={onRevertClick}>
          <Glyphicon glyph="remove-circle" />
          Revert
        </Button>
        &ensp;
        <Button bsStyle="success" onClick={onSaveClick}>
          <Glyphicon glyph="save" />
          Save
        </Button>
      </div>
    </div>
  );
};

export class RevisionData extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activeSeriesIndex: -1,
      activeLabelIndex: -1,
      tool: 'pager',
      showReferenceLine: false,
      composition: null,
      lineWidth: 1,
      caseAttributesProperties: attributeSchemaToProperties(
        props.projectData.caseAttributesSchema
      ),
      labelAttributesProperties: attributeSchemaToProperties(
        props.projectData.labelAttributesSchema
      )
    };

    const server = store.getState().loginUser.data.dicomImageServer;
    this.client = new rs.RsHttpClient(server);
    this.referenceLineAnnotation = new rs.ReferenceLine();
    this.referenceLineAnnotation.color = '#ff0000';

    this.stateChanger = new EventEmitter();
  }

  componentWillUpdate(nextProps, nextState) {
    if (
      this.props.revision.series[this.state.activeSeriesIndex].seriesUid !==
      nextProps.revision.series[this.state.activeSeriesIndex].seriesUid
    ) {
      this.changeActiveSeries(this.state.activeSeriesIndex);
    }

    if (
      this.state.activeSeriesIndex !== nextState.activeSeriesIndex ||
      this.state.activeLabelIndex !== nextState.activeLabelIndex
    ) {
      this.updateLabels(nextProps, nextState);
    }
  }

  componentWillMount() {
    const { revision } = this.props;
    this.changeActiveSeries(0);
    const activeSeries = revision.series[this.state.activeSeriesIndex];
    if (
      activeSeries &&
      activeSeries.labels instanceof Array &&
      activeSeries.labels.length > 0
    ) {
      this.setState({ activeLabelIndex: 0 });
    } else {
      this.setState({ activeLabelIndex: -1 });
    }
  }

  updateLabels = (props, state) => {
    const { revision } = props || this.props;
    const { composition, activeSeriesIndex, activeLabelIndex } =
      state || this.state;
    const activeSeries = revision.series[activeSeriesIndex];
    const labels = activeSeries.labels;
    const activeLabel = labels[activeLabelIndex];
    composition.removeAllAnnotations();
    labels.forEach(label => {
      if (!label.cloud) return;
      const cloud = label.cloud;
      if (activeLabel && label === activeLabel) {
        cloud.active = true;
      } else {
        cloud.active = false;
        if (cloud.expanded) cloud.shrinkToMinimum();
      }
      composition.addAnnotation(cloud);
    });
    if (this.state.showReferenceLine) {
      composition.addAnnotation(this.referenceLineAnnotation);
    }
    composition.annotationUpdated();
    // console.log('Annotations', composition.annotations);
  };

  changeActiveSeries(seriesIndex) {
    const activeSeries = this.props.revision.series[seriesIndex];
    const volumeLoader = new rs.RsVolumeLoader({
      rsHttpClient: this.client,
      series: activeSeries.seriesUid
    });
    const src = new rs.HybridMprImageSource({
      volumeLoader,
      rsHttpClient: this.client,
      series: activeSeries.seriesUid
    });
    const composition = new rs.Composition(src);
    src.ready().then(this.updateLabels);
    this.setState({
      activeSeriesIndex: seriesIndex,
      composition
    });
  }

  changeActiveLabel = (seriesIndex, labelIndex) => {
    if (this.state.activeSeriesIndex !== seriesIndex) {
      this.changeActiveSeries(seriesIndex);
    }
    this.setState({
      activeLabelIndex: labelIndex
    });
  };

  labelAttributesChange = value => {
    const { revision, onChange } = this.props;
    const { activeSeriesIndex, activeLabelIndex } = this.state;
    const activeSeries = revision.series[activeSeriesIndex];
    if (!activeSeries) return null;
    const activeLabel = activeSeries.labels[activeLabelIndex];
    activeLabel.attributes = value;
    onChange(revision);
  };

  caseAttributesChange = value => {
    const { onChange, revision } = this.props;
    revision.attributes = value;
    onChange(revision);
  };

  changeTool = tool => {
    this.setState({ tool });
  };

  toggleReferenceLine = show => {
    this.setState({ showReferenceLine: show });
  };

  selectWindowPreset = preset => {
    const window = { level: preset.level, width: preset.width };
    this.stateChanger.emit('change', state => ({ ...state, window }));
  };

  setLineWidth = lineWidth => {
    const w = +lineWidth;
    this.setState({ lineWidth: w });
    rs.toolFactory('brush').setOptions({ width: w });
    rs.toolFactory('eraser').setOptions({ width: w });
  };

  render() {
    const { projectData, revision, onChange, busy } = this.props;
    const {
      tool,
      activeSeriesIndex,
      activeLabelIndex,
      composition
    } = this.state;
    const activeSeries = revision.series[activeSeriesIndex];
    if (!activeSeries) return null;
    const activeLabel = activeSeries.labels[activeLabelIndex];
    return (
      <div className={classNames('case-revision-data', { busy })}>
        <div className="case-revision-header">
          <Collapser title="Series / Labels" className="labels">
            <LabelSelector
              revision={revision}
              onChange={onChange}
              activeSeries={activeSeries}
              activeLabel={activeLabel}
              onChangeActiveLabel={this.changeActiveLabel}
            />
            <div className="label-attributes">
              <div>
                Label #{activeLabelIndex} of Series #{activeSeriesIndex}
              </div>
              {activeLabel && (
                <PropertyEditor
                  properties={this.state.labelAttributesProperties}
                  value={activeLabel.attributes || {}}
                  onChange={this.labelAttributesChange}
                />
              )}
            </div>
          </Collapser>
          <Collapser title="Case Attributes" className="case-attributes">
            <PropertyEditor
              properties={this.state.caseAttributesProperties}
              value={revision.attributes}
              onChange={this.caseAttributesChange}
            />
          </Collapser>
        </div>
        <ToolBar
          active={tool}
          changeTool={this.changeTool}
          showReferenceLine={this.state.showReferenceLine}
          toggleReferenceLine={this.toggleReferenceLine}
          lineWidth={this.state.lineWidth}
          setLineWidth={this.setLineWidth}
          windowPresets={projectData.windowPresets}
          selectWindowPreset={this.selectWindowPreset}
          brushEnabled={!!activeLabel}
        />
        <ViewerCluster
          composition={composition}
          labels={activeSeries.labels}
          stateChanger={this.stateChanger}
          activeLabel={activeLabel}
          tool={tool}
        />
      </div>
    );
  }
}

const ToolBar = props => {
  const {
    active,
    changeTool,
    showReferenceLine,
    toggleReferenceLine,
    brushEnabled,
    lineWidth,
    setLineWidth,
    windowPresets = [],
    selectWindowPreset
  } = props;

  const widthOptions = [1, 3, 5, 7];

  return (
    <div className="case-detail-toolbar">
      <ToolButton name="pager" changeTool={changeTool} active={active} />
      <ToolButton name="zoom" changeTool={changeTool} active={active} />
      <ToolButton name="hand" changeTool={changeTool} active={active} />
      <ToolButton name="window" changeTool={changeTool} active={active}>
        {windowPresets.map((p, i) => (
          <MenuItem
            key={i + 1}
            eventKey={i + 1}
            onClick={() => selectWindowPreset(p)}
          >
            <b>{p.label}</b> {`(L: ${p.level} / W: ${p.width})`}
          </MenuItem>
        ))}
      </ToolButton>
      <ToolButton
        name="brush"
        changeTool={changeTool}
        active={active}
        disabled={!brushEnabled}
      />
      <ToolButton
        name="eraser"
        changeTool={changeTool}
        active={active}
        disabled={!brushEnabled}
      />
      <ShrinkSelect
        options={widthOptions}
        value={'' + lineWidth}
        onChange={setLineWidth}
      />
      <ToolButton
        name="bucket"
        changeTool={changeTool}
        active={active}
        disabled={!brushEnabled}
      />
      &ensp;
      <label>
        <input
          type="checkbox"
          checked={showReferenceLine}
          onChange={ev => toggleReferenceLine(ev.target.checked)}
        />
        Reference line
      </label>
    </div>
  );
};

const ToolButton = props => {
  const { name, active, changeTool, disabled, children } = props;
  const style = active === name ? 'primary' : 'default';
  const icon = <span className={'case-detail-tool-icon rs-icon-' + name} />;
  const onClick = () => !disabled && changeTool(name);
  if (children) {
    return (
      <SplitButton
        id={`toolbutton-${name}`}
        title={icon}
        bsStyle={style}
        onClick={onClick}
        disabled={disabled}
      >
        {children}
      </SplitButton>
    );
  } else {
    return (
      <Button bsStyle={style} onClick={onClick} disabled={disabled}>
        {icon}
      </Button>
    );
  }
};
