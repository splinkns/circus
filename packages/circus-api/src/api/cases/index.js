import status from 'http-status';
import performSearch from '../performSearch';
import { generateCaseId } from '../../utils';
import * as EJSON from 'mongodb-extended-json';
import MultiRange from 'multi-integer-range';

const maskPatientInfo = ctx => {
  return caseData => {
    const wantToView = ctx.user.preferences.personalInfoView;
    const accessibleProjects = ctx.userPrivileges.accessibleProjects;
    const project = accessibleProjects.find(
      p => caseData.projectId === p.projectId
    );
    if (!project) {
      throw new Error(
        `Project ${caseData.projectId} is not accessbible by ${
          ctx.user.userEmail
        }.`
      );
    }
    const viewable = project.roles.some(r => r === 'viewPersonalInfo');
    const view = viewable && wantToView;
    if (!view) {
      delete caseData.patientInfoCache;
    }
    return caseData;
  };
};

export const handleGet = () => {
  return async (ctx, next) => {
    const aCase = ctx.case;
    delete aCase.latestRevision; // Remove redundant data
    ctx.body = maskPatientInfo(ctx)(aCase);
  };
};

async function makeNewCase(
  models,
  user,
  userPrivileges,
  project,
  series,
  tags
) {
  const caseId = generateCaseId();

  let patientInfoCache = null;
  const seriesData = [];
  const domains = {};

  // Check write access for the project.
  const ok = userPrivileges.accessibleProjects.some(
    p => p.roles.indexOf('write') >= 0 && p.projectId === project.projectId
  );
  if (!ok) {
    throw new Error('You do not have write privilege for this project.');
  }

  // Check domain and image range for each series.
  for (const seriesEntry of series) {
    const seriesUid = seriesEntry.seriesUid;
    const item = await models.series.findById(seriesUid);
    if (!item) {
      throw new Error('Nonexistent series.');
    }
    if (!new MultiRange(item.images).has(seriesEntry.range)) {
      throw new Error('Specified range is invalid.');
    }

    item.range = seriesEntry.range;
    seriesData.push(item);
    if (userPrivileges.domains.indexOf(item.domain) < 0) {
      throw new Error('You cannot access this series.');
    }
    if (!patientInfoCache) {
      patientInfoCache = item.patientInfo;
    }
    domains[item.domain] = true;
  }

  const revision = {
    creator: user.userEmail,
    date: new Date(),
    description: 'Created new case.',
    attributes: {},
    status: 'draft',
    series: seriesData.map(s => ({
      seriesUid: s.seriesUid,
      images: s.range,
      labels: []
    }))
  };

  await models.clinicalCase.insert({
    caseId,
    projectId: project.projectId,
    patientInfoCache,
    tags,
    latestRevision: revision,
    revisions: [revision],
    domains: Object.keys(domains)
  });
  return caseId;
}

export const handlePost = ({ models }) => {
  return async (ctx, next) => {
    const project = await models.project.findByIdOrFail(
      ctx.request.body.projectId
    );
    const caseId = await makeNewCase(
      models,
      ctx.user,
      ctx.userPrivileges,
      project,
      ctx.request.body.series,
      ctx.request.body.tags
    );
    ctx.body = { caseId };
  };
};

export const handlePostRevision = ({ models }) => {
  return async (ctx, next) => {
    const aCase = ctx.case;
    const rev = ctx.request.body;

    if (rev.date) {
      ctx.throw(status.BAD_REQUEST, 'You cannot specify revision date.');
    }
    if (rev.creator) {
      ctx.throw(status.BAD_REQUEST, 'You cannot specify revision creator.');
    }

    rev.date = new Date();
    rev.creator = ctx.user.userEmail;

    await models.clinicalCase.modifyOne(aCase.caseId, {
      latestRevision: rev,
      revisions: [...aCase.revisions, rev]
    });
    ctx.body = null; // No Content
  };
};

export const handleSearch = ({ models }) => {
  return async (ctx, next) => {
    const urlQuery = ctx.request.query;
    let customFilter;
    try {
      customFilter = urlQuery.filter ? EJSON.parse(urlQuery.filter) : {};
    } catch (err) {
      ctx.throw(status.BAD_REQUEST, 'Bad filter.');
    }
    // const domainFilter = {};
    const accessibleProjectIds = ctx.userPrivileges.accessibleProjects.map(
      p => p.projectId
    );
    const accessibleProjectFilter = {
      projectId: { $in: accessibleProjectIds }
    };
    const filter = {
      $and: [customFilter, accessibleProjectFilter /* domainFilter */]
    };

    const mask = maskPatientInfo(ctx);
    const transform = caseData => {
      delete caseData.revisions;
      return mask(caseData);
    };

    await performSearch(models.clinicalCase, filter, ctx, { transform });
  };
};
