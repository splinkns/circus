import React, { useState, useEffect, useCallback } from 'react';
import { startNewSearch, savePreset } from 'actions';
import { useLoginManager } from 'utils/loginManager';
import { useApi } from 'utils/api';
import { useSelector, useDispatch } from 'react-redux';

const initialCondition = (state, searchName, presetName) => {
  const presetKey = searchName + 'SearchPresets';
  const presets = state.loginUser.data.preferences[presetKey];
  const matched = presets && presets.find(preset => preset.name === presetName);
  if (matched) return JSON.parse(matched.condition);
  if (state.searches[searchName]) return state.searches[searchName].condition;
  return undefined;
};

// const useSearch = (opts: object) => {
//   const {
//     nullCondition,
//     conditionToFilter,
//     searchName,
//     resource,
//     defaultSort,
//     presetName
//   } = opts;

//   const state = useSelector(state => state);
//   const [condition, setCondition] = useState(
//     () => initialCondition(state, searchName, presetName) || nullCondition()
//   );
//   const loginManager = useLoginManager();
//   const dispatch = useDispatch();
//   const api = useApi();

//   const handleChange = newCondition => setCondition(newCondition);

//   const handleSearchClick = () => {
//     dispatch(
//       startNewSearch(
//         api,
//         searchName,
//         resource,
//         conditionToFilter(condition),
//         condition,
//         defaultSort
//       )
//     );
//   };

//   // The following is invoked only on first-time render
//   // eslint-disable-next-line
//   useEffect(handleSearchClick, [dispatch, api]);

//   const handleSavePresetClick = async () => {
//     await dispatch(savePreset(api, searchName, condition));
//     loginManager.refreshUserInfo(true);
//   };

//   const handleResetClick = () => {
//     setCondition(nullCondition());
//   };

//   const { onChange, onSearchClick, onResetClick, ...rest } = props;
//   return (
//     <BaseComponent
//       onChange={handleChange}
//       onSearchClick={handleSearchClick}
//       onResetClick={handleResetClick}
//       onSavePresetClick={handleSavePresetClick}
//       condition={condition}
//       {...rest}
//     />
//   );
// };

/**
 * Creates a HOC that remembers the current editing condition and
 * starts a new search.
 */
const sendSearchCondition = opts => {
  const {
    nullCondition,
    conditionToFilter,
    searchName,
    resource,
    defaultSort
  } = opts;

  return function (BaseComponent) {
    const Enhanced = props => {
      const { presetName } = props;
      const state = useSelector(state => state);
      const [condition, setCondition] = useState(
        () => initialCondition(state, searchName, presetName) || nullCondition()
      );
      const loginManager = useLoginManager();
      const dispatch = useDispatch();
      const api = useApi();

      const handleChange = newCondition => {
        setCondition(newCondition);
      };

      const handleSearchClick = () => {
        dispatch(
          startNewSearch(
            api,
            searchName,
            resource,
            conditionToFilter(condition),
            condition,
            defaultSort
          )
        );
      };

      // The following is invoked only on first-time render
      // eslint-disable-next-line
      useEffect(handleSearchClick, [dispatch, api]);

      const handleSavePresetClick = async () => {
        await dispatch(savePreset(api, searchName, condition));
        loginManager.refreshUserInfo(true);
      };

      const handleResetClick = () => {
        setCondition(nullCondition());
      };

      const { onChange, onSearchClick, onResetClick, ...rest } = props;
      return (
        <BaseComponent
          onChange={handleChange}
          onSearchClick={handleSearchClick}
          onResetClick={handleResetClick}
          onSavePresetClick={handleSavePresetClick}
          condition={condition}
          {...rest}
        />
      );
    };

    Enhanced.displayName = `searchPanel(${searchName})`;
    return Enhanced;
  };
};

export default sendSearchCondition;
