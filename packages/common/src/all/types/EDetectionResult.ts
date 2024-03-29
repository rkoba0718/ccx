import FileId from "./FileId";
import FilePath from "./FilePath";
import ClonePair from "./ClonePair";
import ClonePairId from "./ClonePairId";
import Environment from "./Environment";
import DetectionResult from "./DetectionResult";
import Fragment from "./Fragment";

type EDetectionResult = {
	environment: Environment;
	files: Record<number, FilePath>;
	clonePairs: Record<number, ClonePair>;
};

export type MappingResult = {
	base: EDetectionResult;
	comparing: EDetectionResult;
	comparingToAllF: Record<number, FileId | undefined>;
	baseToComparing: Record<number, ClonePairId[]>;
	comparingToBase: Record<number, ClonePairId[]>;
	allGrids: Record<
		number,
		Record<
			number,
			{
				base: ClonePairId[];
				comparing: ClonePairId[];
			}
		>
	>;
	allFiles: Record<
		number,
		{
			path: FilePath;
			base?: FileId;
			comparing?: FileId;
		}
	>;
	clonesPerFile: Record<
		number,
		{
			path: FilePath;
			baseClones?: Fragment[];
			comparingClones?: Fragment[];
			matchBaseClones?: Fragment[];
			matchComparingClones?: Fragment[];
			unmatchedBaseClones?: Fragment[];
			unmatchedComparingClones?: Fragment[];
			baseCloneSet?: Fragment[][];
			comparingCloneSet?: Fragment[][];
			matchBaseCloneSets?: Fragment[][];
			matchComparingCloneSets?: Fragment[][];
			unmatchedBaseCloneSets?: Fragment[][];
			unmatchedComparingCloneSets?: Fragment[][];
			matchBases?: Fragment[];
			matchComparings?: Fragment[];
			sum: number;
			matchRate: number;
		}
	>;
};

export const convertE = (result: DetectionResult): EDetectionResult => {
	const files: Record<number, FilePath> = {};
	const clonePairs: Record<number, ClonePair> = {};

	result.files.forEach((f) => {
		files[f.id] = f.path;
	});

	result.clonePairs.forEach((cp): void => {
		clonePairs[cp.id] = cp;
	});

	return {
		environment: result.environment,
		files,
		clonePairs
	};
};

// eslint-disable-next-line no-undef
export default EDetectionResult;
