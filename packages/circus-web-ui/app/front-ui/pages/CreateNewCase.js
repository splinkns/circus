import React from 'react';
import ProjectSelector from 'components/ProjectSelector';
import { connect } from 'react-redux';
import IconButton from 'rb/IconButton';
import MultiTagSelect from 'components/MultiTagSelect';
import { Panel, ListGroup, ListGroupItem } from 'components/react-bootstrap';
import { api } from 'utils/api';

class CreateNewCaseView extends React.Component {
	constructor(props) {
		super(props);
		const writableProjects = this.writableProjects(props);
		if (writableProjects.length) {
			this.state = {
				selectedProject: writableProjects[0].projectId,
				selectedSeries: [props.params.uid],
				selectedTags: []
			};
		}
		this.handleProjectSelect = this.handleProjectSelect.bind(this);
		this.handleCreate = this.handleCreate.bind(this);
		this.handleTagChange = this.handleTagChange.bind(this);
	}

	writableProjects(props) {
		return props.user.accessibleProjects.filter(
			p => p.roles.indexOf('write') >= 0
		);
	}

	handleProjectSelect(projectId) {
		const { user } = this.props;
		const prj = user.accessibleProjects.find(p => p.projectId === projectId);
		const newTags = this.state.selectedTags.filter(
			t => prj.project.tags.find(tt => tt.name === t)
		);
		this.setState({
			selectedProject: projectId,
			selectedTags: newTags
		});
	}

	handleTagChange(value) {
		this.setState({ selectedTags: value });
	}

	async handleCreate() {
		await api('cases', {
			method: 'post',
			data: {
				project: this.state.selectedProject,
				series: this.state.selectedSeries,
				tags: this.state.selectedTags
			}
		});
		alert('Created!');
	}

	render() {
		// const { user } = this.props;
		const writableProjects = this.writableProjects(this.props);

		if (!writableProjects.length) {
			return <div className='alert alert-danger'>
				You do not belong to any writable project.
			</div>;
		}

		const prj = writableProjects.find(p => p.projectId === this.state.selectedProject);
		const tags = prj.project.tags;

		return <div>
			<h1><span className='circus-icon-case' />New Case</h1>
			<Panel collapsible defaultExpanded header='Series'>
				<ListGroup fill>
					{this.state.selectedSeries.map((s, i) => (
						<ListGroupItem key={s}>
							<b>Volume {i}</b>: {s}
						</ListGroupItem>
					))}
					<ListGroupItem>
						<IconButton icon='plus' bsSize='sm'>Add Another Series</IconButton>
					</ListGroupItem>
				</ListGroup>
			</Panel>
			<div>
				Project:&ensp;
				<ProjectSelector
					projects={writableProjects}
					value={this.state.selectedProject}
					onChange={this.handleProjectSelect}
				/>
				&ensp;
				Tags:&ensp;
				<MultiTagSelect
					tags={tags}
					value={this.state.selectedTags}
					onChange={this.handleTagChange}
				/>
				&ensp;
				<IconButton
					icon='star'
					bsStyle='primary'
					onClick={this.handleCreate}
				>
					Create
				</IconButton>
			</div>
		</div>;
	}
}

const CreateNewCase = connect(
	state => {
		return { user: state.loginUser.data };
	}
)(CreateNewCaseView);

export default CreateNewCase;