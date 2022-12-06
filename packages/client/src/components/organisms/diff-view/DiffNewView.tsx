import React from "react";
import { Redirect, useLocation } from "react-router-dom";
import { CircularProgress, makeStyles } from "@material-ui/core";

import { MappingResult } from "common/all/types/EDetectionResult";
import ClonePair from "common/all/types/ClonePair";
import Fragment from "common/all/types/Fragment";
import Position from "common/all/types/Position";
import ClonePairId from "common/all/types/ClonePairId";
import Similarity from "common/all/types/Similarity";
import FilePath from "common/all/types/FilePath";
import FileId from "common/all/types/FileId";

import SplitPane from "components/atoms/SplitPane";
import ClonesExplorer from "components/organisms/diff-view/ClonesExplorer";

import useMappingResult from "hooks/useMappingResult";
import useQueryParam from "hooks/useQueryParam";
import compareFragment from "common/all/utils/compareFragment";

const DiffClonePairView = React.lazy(
	() => import("components/organisms/diff-view/DiffClonePairView")
);

type Props = {
	clonesPerFile: Record<
		number,
		{
			path: FilePath;
			baseClones?: Fragment[];
			comparingClones?: Fragment[];
			matchBaseClones?: Fragment[];
			matchComparingClones?: Fragment[];
		}
	>;
};

const useStyles = makeStyles({
	root: {
		"& > *": {
			height: "68%",
			overflowY: "scroll"
		}
	}
});

const useCellCoordinate = (result: MappingResult) => {
	const params = useQueryParam();
	return React.useMemo(() => {
		const [xx, yy] = [params.get("x"), params.get("y")];
		if (
			xx !== null &&
			yy !== null &&
			xx in result.allFiles &&
			yy in result.allFiles
		) {
			const [x, y] = [Number(xx), Number(yy)];
			return x < y ? { x, y } : { y, x };
		}
		return null;
	}, [params, result]);
};

const mergeFragments = (f1: Fragment, f2: Fragment): Fragment => ({
	file: f1.file,
	begin: (Math.min(f1.begin, f2.begin) as unknown) as Position,
	end: (Math.max(f1.end, f2.end) as unknown) as Position
});

const mergeClonePairs = (p1: ClonePair, p2: ClonePair): ClonePair => {
	return {
		id: 0 as ClonePairId,
		similarity: -1 as Similarity,
		f1: mergeFragments(p1.f1, p2.f1),
		f2: mergeFragments(p1.f2, p2.f2)
	};
};

const useMatchClones = () => {
	const { result } = useMappingResult();
	return React.useMemo(() => {
		const file: {
			id: number;
			path: FilePath;
		}[] = [];
		// let baseClones: {
		// 	path: FilePath;
		// 	begin: Position;
		// 	end: Position;
		// }[] = [];
		// const comparingClones: Fragment[] = [];
		// const matchBaseClones: Fragment[] = [];
		// const matchComparingClones: Fragment[] = [];

		Object.entries(result.clonesPerFile).forEach(([id, c]) => {
			// const base = c.baseClones;
			file.push({
				id: Number(id),
				path: c.path
			});
			// if (base !== undefined) {
			// 	baseClones.push({base.map(([id, b]) => {
			// 		path: c.path,
			// 		begin: b[Number(id)].begin,
			// 		end: b[Number(id)].enf
			// 	})});
			// }

			// comparingClones.push(c.comparingClones);
		});

		return {
			file
			// baseClones,
			// comparingClones,
			// matchBaseClones,
			// matchComparingClones
		};
	}, [result]);
};

const useSelected = () => {
	const { hash } = useLocation();
	return React.useMemo(() => {
		if (hash.startsWith("#")) {
			return hash.split("#")[1];
		}

		return null;
	}, [hash]);
};

const DiffNewView: React.FunctionComponent<Props> = ({ clonesPerFile }) => {
	const { root } = useStyles();
	const selected = useSelected();
	const m = useMatchClones();

	// if (c === null) {
	// 	return <Redirect to={`/home/${project}/diff`} />;
	// }

	return (
		<>
			<SplitPane
				className={root}
				allowResize
				split="vertical"
				minSize={250}
			>
				<ClonesExplorer selected={selected} file={m.file} />
				<React.Suspense fallback={<CircularProgress />}>
					{/* <DiffClonePairView
						project={project}
						x={c.x}
						y={c.y}
						selected={selected}
						baseUnmapped={c.baseUnmapped}
						comparingUnmapped={c.comparingUnmapped}
						unifiedClonePairs={c.unifiedClonePairs}
					/> */}
					hoeg
				</React.Suspense>
			</SplitPane>
		</>
	);
};

export default DiffNewView;
