import React from "react";
import { useParams } from "react-router-dom";
import { EditorDidMount } from "react-monaco-editor";
import * as Monaco from "monaco-editor/esm/vs/editor/editor.api";
import { makeStyles } from "@material-ui/core";
import useSWR from "swr";

import Fragment from "common/all/types/Fragment";

import * as fetchCode from "common/auth-client/api/v1/projects/_projectName/_revision";

import { jsonFetcher } from "utils/fetcher";
import useMatchResult, {
	State as MatchResultState
} from "hooks/useMatchResult";
import CloneCodeView from "components/molecules/CloneCodeView";

type DecorationIdMap = Record<string, string[]>;

type DecoratingFragments = Record<string, Fragment[]>;

type Instance = {
	editor: Monaco.editor.ICodeEditor;
	monaco: typeof Monaco;
};

const useStyles = makeStyles({
	root: {
		height: "100%"
	},
	clone: {
		width: "5px !important",
		marginLeft: "5px"
	},
	selected: {
		width: "7px !important",
		marginLeft: "4px",
		zIndex: 3
	},
	baseUnmatched: {
		backgroundColor: "#ffe6e6",
		zIndex: 1
	},
	baseUnmatchedSelected: {
		backgroundColor: "#ff3d3d"
	},
	comparingUnmatched: {
		backgroundColor: "#e6e8ff"
	},
	comparingUnmatchedSelected: {
		backgroundColor: "#3d5aff"
	},
	matched: {
		backgroundColor: "#f7e6ff",
		zIndex: 2
	},
	matchedSelected: {
		backgroundColor: "#bb3dff"
	}
});

const createDecoration = (
	fragment: Fragment,
	className: string
): Monaco.editor.IModelDeltaDecoration => ({
	range: new Monaco.Range(fragment.begin, 1, fragment.end - 1, 1),
	options: {
		isWholeLine: true,
		linesDecorationsClassName: className
	}
});

const updateDecoration = (
	editor: Monaco.editor.ICodeEditor,
	oldDecorationId: string,
	decorationIdMap: DecorationIdMap,
	decoratingFragments: DecoratingFragments,
	className: string
): string[] => {
	if (oldDecorationId in decorationIdMap) {
		return editor.deltaDecorations(
			decorationIdMap[oldDecorationId],
			decoratingFragments[oldDecorationId].map((f) =>
				createDecoration(f, className)
			)
		);
	}

	return [];
};

const setInitialDecorations = (
	classes: Record<string, string>,
	codeEditor: Monaco.editor.ICodeEditor,
	decoratingFragments: DecoratingFragments
): DecorationIdMap => {
	const decorations = Object.entries(decoratingFragments).flatMap(
		([id, fragments]) => {
			if (id.startsWith("b")) {
				return fragments.map((f) =>
					createDecoration(
						f,
						`${classes.clone} ${classes.baseUnmatched}`
					)
				);
			}
			if (id.startsWith("c")) {
				return fragments.map((f) =>
					createDecoration(
						f,
						`${classes.clone} ${classes.comparingUnmatched}`
					)
				);
			}
			return fragments.map((f) =>
				createDecoration(f, `${classes.clone} ${classes.matched}`)
			);
		}
	);

	const decorationIds = codeEditor.deltaDecorations([], decorations);

	const idMap: DecorationIdMap = {};
	Object.keys(decoratingFragments).forEach((stringId, index) => {
		if (stringId in idMap) {
			idMap[stringId].push(decorationIds[index]);
		} else {
			idMap[stringId] = [decorationIds[index]];
		}
	});
	return idMap;
};

const highlightSelected = (
	editor: Monaco.editor.ICodeEditor,
	selected: string | null,
	previousSelected: string | null,
	classes: Record<string, string>,
	decorationIdMap: DecorationIdMap,
	decoratingFragments: DecoratingFragments
): [DecorationIdMap, string | null] => {
	const next = { ...decorationIdMap };
	console.log(`${previousSelected} to ${selected}`);

	if (
		selected !== null &&
		selected !== previousSelected &&
		selected in next
	) {
		const f = decoratingFragments[selected][0];

		next[selected] = updateDecoration(
			editor,
			selected,
			next,
			decoratingFragments,
			`${classes.selected} ${
				selected.startsWith("b")
					? classes.baseUnmatchedSelected
					: selected.startsWith("c")
					? classes.comparingUnmatchedSelected
					: classes.matchedSelected
			}`
		);
		editor.revealLinesNearTop(
			f.begin,
			f.end,
			Monaco.editor.ScrollType.Smooth
		);
	}

	if (
		previousSelected !== null &&
		previousSelected !== selected &&
		previousSelected in next
	) {
		next[previousSelected] = updateDecoration(
			editor,
			previousSelected,
			next,
			decoratingFragments,
			`${classes.selected} ${
				previousSelected.startsWith("b")
					? classes.baseUnmatched
					: previousSelected.startsWith("c")
					? classes.comparingUnmatched
					: classes.matched
			}`
		);
	}

	return [next, selected];
};

type State = {
	fileDependent: {
		orientation: "left" | "right";
		decoratingFragments: DecoratingFragments;
	};
	selectedDependent: {
		decorationIdMap: DecorationIdMap;
		previousSelected: string | null;
	};
};

type Action =
	| {
			type: "set-file";
			payload: {
				editor: Monaco.editor.ICodeEditor;
				text: string;
				result: MatchResultState;
				classes: Record<string, string>;
				orientation: "left" | "right";
			};
	  }
	| {
			type: "set-selected";
			payload: {
				editor: Monaco.editor.ICodeEditor;
				result: MatchResultState;
				selected: string | null;
				classes: Record<string, string>;
			};
	  };

const reducer: React.Reducer<State, Action> = (state, action): State => {
	switch (action.type) {
		case "set-file": {
			const {
				editor,
				text,
				result,
				classes,
				orientation
			} = action.payload;
			const baseUri = Monaco.Uri.parse(result.clones.path);
			if (editor.getModel()?.uri.toString() === baseUri.toString()) {
				return state;
			}

			const decoratingFragments: DecoratingFragments = {};

			if (orientation === "left") {
				if (result.clones.matchBaseClones) {
					result.clones.matchBaseClones.forEach((mb, id) => {
						decoratingFragments[`m${id}`] = [mb];
					});
				}
				if (result.clones.unmatchedBaseClones) {
					result.clones.unmatchedBaseClones.forEach((b, id) => {
						decoratingFragments[`b${id}`] = [b];
					});
				}
			} else if (orientation === "right") {
				if (result.clones.matchComparingClones) {
					result.clones.matchComparingClones.forEach((mb, id) => {
						decoratingFragments[`m${id}`] = [mb];
					});
				}
				if (result.clones.unmatchedComparingClones) {
					result.clones.unmatchedComparingClones.forEach((b, id) => {
						decoratingFragments[`c${id}`] = [b];
					});
				}
			}

			const model = Monaco.editor.getModel(baseUri);

			if (model) {
				editor.setModel(model);
			} else {
				editor.setModel(
					Monaco.editor.createModel(text, undefined, baseUri)
				);
			}
			const decorationIdMap = setInitialDecorations(
				classes,
				editor,
				decoratingFragments
			);

			return {
				fileDependent: {
					orientation,
					decoratingFragments
				},
				selectedDependent: {
					previousSelected: null,
					decorationIdMap
				}
			};
		}

		case "set-selected": {
			const { editor, result, selected, classes } = action.payload;
			if (selected === state.selectedDependent.previousSelected) {
				return state;
			}

			const [decorationIdMap, previousSelected] = highlightSelected(
				editor,
				selected,
				state.selectedDependent.previousSelected,
				classes,
				state.selectedDependent.decorationIdMap,
				state.fileDependent.decoratingFragments
			);
			return {
				...state,
				selectedDependent: {
					previousSelected,
					decorationIdMap
				}
			};
		}
	}

	return state;
};

type Props = {
	revision: string;
	selected: string | null;
	orientation: "left" | "right";
};

const DiffCloneView: React.FunctionComponent<Props> = ({
	revision,
	selected,
	orientation
}) => {
	const classes = useStyles();
	const { project } = useParams<{
		project: string;
	}>();

	const [result] = useMatchResult();

	const { data } = useSWR(
		fetchCode.route(project, revision, result.clones.path),
		jsonFetcher<fetchCode.GetResponse>()
	);

	if (!data || data.error || "entries" in data) {
		throw data;
	}

	const [instance, setInstance] = React.useState<Instance | null>(null);
	const [state, dispatch] = React.useReducer(reducer, {
		fileDependent: {
			orientation,
			decoratingFragments: {}
		},
		selectedDependent: {
			decorationIdMap: {},
			previousSelected: null
		}
	});

	const editorDidMount: EditorDidMount = React.useCallback(
		(editor, monaco) => {
			setInstance({
				editor,
				monaco
			});
		},
		[setInstance]
	);

	// on selected file changed
	React.useEffect(() => {
		if (instance) {
			dispatch({
				type: "set-file",
				payload: {
					editor: instance.editor,
					result,
					text: data.text,
					classes,
					orientation
				}
			});

			if (selected) {
				dispatch({
					type: "set-selected",
					payload: {
						editor: instance.editor,
						result,
						selected,
						classes
					}
				});
			}
		}
	}, [instance, result, classes, data.text, orientation, selected]);

	// on selected clone changed
	React.useEffect(() => {
		if (!instance) {
			return;
		}
		dispatch({
			type: "set-selected",
			payload: {
				editor: instance.editor,
				result,
				selected,
				classes
			}
		});
	}, [instance, selected, classes, result]);

	return <CloneCodeView editorDidMount={editorDidMount} />;
};

export default DiffCloneView;
