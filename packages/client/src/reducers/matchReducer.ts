import ClonePair from "common/all/types/ClonePair";
import { MappingResult } from "common/all/types/EDetectionResult";
import File from "common/all/types/File";
import FileId from "common/all/types/FileId";
import FilePath from "common/all/types/FilePath";
import Fragment from "common/all/types/Fragment";

export type State = {
	result: MappingResult;
	clones: {
		path: FilePath;
		baseClones?: Fragment[];
		comparingClones?: Fragment[];
		matchBaseClones?: Fragment[];
		matchComparingClones?: Fragment[];
		diff: number;
	};
};

export type Action = {
	type: "set-file";
	payload: {
		path: FilePath;
	};
};

export const defaultState: (args: {
	result: MappingResult;
	clones: {
		path: FilePath;
		baseClones?: Fragment[];
		comparingClones?: Fragment[];
		matchBaseClones?: Fragment[];
		matchComparingClones?: Fragment[];
		diff: number;
	};
}) => State = ({ result, clones }) => ({ result, clones });

const reducer = (state: State, action: Action): State => {
	console.log(action);
	switch (action.type) {
		case "set-file": {
			const file = Object.values(state.result.clonesPerFile).find(
				(value) => value.path === action.payload.path
			);

			if (file) {
				return {
					...state,
					clones: file
				};
			}
			return state;
		}

		default: {
			return state;
		}
	}
};

export default reducer;
