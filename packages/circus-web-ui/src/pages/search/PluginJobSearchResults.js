import React from 'react';
import SearchResultsView, {
  makeSortOptions
} from 'components/SearchResultsView';
import DataGrid from 'components/DataGrid';
import PatientInfoBox from 'components/PatientInfoBox';
import TimeDisplay from 'components/TimeDisplay';
import PluginDisplay from 'components/PluginDisplay';
import IconButton from 'components/IconButton';
import { ProgressBar } from 'components/react-bootstrap';
import browserHistory from 'browserHistory';
import styled from 'styled-components';

const Operation = props => {
  const { value: job } = props;

  const handleClick = () => {
    if (job.status !== 'finished') return;
    const url = `/plugin-job/${job.jobId}`;
    browserHistory.push(url);
  };

  return (
    <IconButton
      disabled={job.status !== 'finished'}
      icon="circus-series"
      bsSize="sm"
      bsStyle="primary"
      onClick={handleClick}
    >
      View
    </IconButton>
  );
};

const PluginRenderer = props => {
  const { value: { pluginId } } = props;
  return <PluginDisplay size="lg" pluginId={pluginId} />;
};

const StatusRenderer = ({ value: { status } }) => {
  if (status === 'processing') {
    return <ProgressBar active bsStyle="info" now={100} label="processing" />;
  }
  const className = {
    in_queue: 'text-info',
    finished: 'text-success',
    invalidated: 'text-muted'
  }[status];
  return <span className={className || 'text-danger'}>{status}</span>;
};

const columns = [
  {
    caption: 'Patient',
    className: 'patient',
    renderer: ({ value: { patientInfo } }) => {
      return <PatientInfoBox value={patientInfo} />;
    }
  },
  {
    caption: 'Plugin',
    className: 'plugin',
    renderer: PluginRenderer
  },
  {
    caption: 'Executed by',
    className: 'executed-by',
    renderer: ({ value: { userEmail } }) => {
      return userEmail.slice(0, 10) + '...';
    }
  },
  {
    caption: 'Execution Time',
    className: 'executoin-time',
    renderer: props => <TimeDisplay value={props.value.startedAt} />
  },
  {
    caption: 'Status',
    className: 'status',
    renderer: StatusRenderer
  },
  { caption: '', className: 'operation', renderer: Operation }
];

const DataViewContainer = styled.div`
  .progress {
    height: 33px;
  }
  .progress-bar-info {
    line-height: 33px;
  }
  .status {
    text-align: center;
    font-weight: bold;
  }
`;

const DataView = props => {
  const { value } = props;
  return (
    <DataViewContainer>
      <DataGrid
        className="plugin-job-search-result"
        columns={columns}
        value={value}
      />
    </DataViewContainer>
  );
};

const sortOptions = makeSortOptions({
  createdAt: 'job date'
});

const PluginSearchResults = props => {
  return (
    <SearchResultsView
      sortOptions={sortOptions}
      dataView={DataView}
      refreshable
      name="pluginJobs"
    />
  );
};

export default PluginSearchResults;