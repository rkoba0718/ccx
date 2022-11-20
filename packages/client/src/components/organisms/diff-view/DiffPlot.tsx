import React from "react";
import { useHistory, useLocation } from "react-router-dom";
import {
	Box,
	BoxProps,
	Typography,
	Divider,
	Grid,
	Button
} from "@material-ui/core";
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	BarElement,
	Title,
	Tooltip,
	Legend
} from "chart.js";

import { Bar } from "react-chartjs-2";
import { faker } from "@faker-js/faker";

import { MappingResult } from "common/all/types/EDetectionResult";
import FilePath from "common/all/types/FilePath";

import useMappingResult from "hooks/useMappingResult";
import useQueryParam from "hooks/useQueryParam";

ChartJS.register(
	CategoryScale,
	LinearScale,
	BarElement,
	Title,
	Tooltip,
	Legend
);

type State = {
	x: number;
	y: number;
	xPath: FilePath;
	yPath: FilePath;
	disabled: boolean;
};

type SetActionPayload = {
	x: number;
	y: number;
	result: MappingResult;
};

type Action = {
	type: "set";
	payload: SetActionPayload;
};

const setAction = ({ x, y, result }: SetActionPayload): State => ({
	x,
	y,
	xPath: result.allFiles[x].path,
	yPath: result.allFiles[y].path,
	disabled: !(y in result.allGrids && x in result.allGrids[y])
});

const reducer = (state: State, action: Action): State => {
	const next = { ...state };
	// eslint-disable-next-line default-case
	switch (action.type) {
		case "set": {
			return setAction(action.payload);
		}
	}

	return next;
};

const from = [255, 183, 15];
const to = [255, 36, 20];
const each = (from_: number, to_: number, f: number) => {
	const r = Math.round(from_ + (to_ - from_) * f);
	return r;
};

const colorSelector = (f: number) => {
	if (f === 0) {
		return "rgba(45, 191, 0, 1)";
	}
	const r = each(from[0], to[0], f);
	const g = each(from[1], to[1], f);
	const b = each(from[2], to[2], f);
	return `rgba(${r}, ${g}, ${b}, 1)`;
};

type CellProps = {
	x: number;
	y: number;
	onCellClick: (x: number, y: number) => void;
};

const Cell: React.FunctionComponent<CellProps> = ({ x, y, onCellClick }) => {
	const { result } = useMappingResult();
	const [xx, yy] = x < y ? [x, y] : [y, x];

	const style = React.useMemo(() => {
		let col = "#fff";
		const cp = result.allGrids[yy][xx];
		if (cp && cp.base.length !== 0) {
			const baseMatched = cp.base.filter(
				(p) => result.baseToComparing[p] !== undefined
			).length;
			const comparingMatched = cp.comparing.filter(
				(p) => result.comparingToBase[p] !== undefined
			).length;

			const all = cp.base.length + cp.comparing.length;
			col = colorSelector(1 - baseMatched / cp.base.length);
		}

		return {
			width: "12px",
			height: "12px",
			border: "solid 1px #888",
			backgroundColor: col
		};
	}, [result, xx, yy]);

	const onClick = React.useCallback(() => onCellClick(xx, yy), [
		xx,
		yy,
		onCellClick
	]);

	return <Box style={style} onClick={onClick} />;
};

type DiffGridProps = {
	onCellClick: (x: number, y: number) => void;
};

/*
const diffGridSx: BoxProps["sx"] = {
	flexWrap: "nowrap",
	display: "flex"
};
*/

// eslint-disable-next-line react/display-name
const DiffGrid: React.FunctionComponent<DiffGridProps> = React.memo(
	({ onCellClick }) => {
		const { result } = useMappingResult();

		return (
			<Box>
				{Object.entries(result.allFiles).map(([yPath], y) => (
					<Box key={`row-${yPath}`} flexWrap="nowrap" display="flex">
						{Object.entries(result.allFiles).map(([xPath], x) => (
							<Cell
								key={`${xPath}-${yPath}`}
								x={x}
								y={y}
								onCellClick={onCellClick}
							/>
						))}
					</Box>
				))}
			</Box>
		);
	}
);

type Props = {
	project: string;
};

const sx = { mt: 2 };
const DiffPlot: React.FunctionComponent<Props> = ({ project }) => {
	const history = useHistory();
	const { pathname } = useLocation();
	const params = useQueryParam();

	const { base, comparing, revision, result } = useMappingResult();

	const [state, dispatch] = React.useReducer(
		reducer,
		{ x: 0, y: 0, result },
		setAction
	);

	React.useEffect(() => {
		const x = params.get("x");
		const y = params.get("y");

		if (x === null || y === null) {
			history.push(`${pathname}?b=${base}&c=${comparing}&r=${revision}`);
			// history.push(`${pathname}?b=${base}&c=${comparing}&r=${revision}`);
			return;
		}
		dispatch({
			type: "set",
			payload: {
				x: Number(x),
				y: Number(y),
				result
			}
		});
	}, [params, result, pathname]);

	const onCellClick = React.useCallback(
		(x: number, y: number) => {
			history.push(
				`${pathname}?b=${base}&c=${comparing}&r=${revision}&x=${x}&y=${y}`
			);
		},
		[pathname, base, comparing, revision, dispatch, result]
		// [pathname, , base, comparing, revision, dispatch, result]
	);

	const onCompareClick = React.useCallback(() => {
		const { x, y } = state;
		const [xx, yy] = x < y ? [x, y] : [y, x];
		history.push(
			`/home/${project}/diff/view?b=${base}&c=${comparing}&r=${revision}&x=${xx}&y=${yy}`
		);
	}, [project, base, comparing, revision, state]);

	const labels: string[] = [];
	const baseData: number[] = [];
	const comparingData: number[] = [];
	const matchData: number[] = [];
	Object.entries(result.clonePairIdsPerFile).forEach(([, c]) => {
		labels.push(c.path);
		if (c.baseClonePairIds != null) {
			baseData.push(c.baseClonePairIds.length);
		} else {
			baseData.push(0);
		}
		if (c.comparingClonePairIds != null) {
			comparingData.push(c.comparingClonePairIds.length);
		} else {
			comparingData.push(0);
		}
		if (c.matchClonePairIds != null) {
			matchData.push(c.matchClonePairIds.length);
		} else {
			matchData.push(0);
		}
	});

	const baseSum = baseData.reduce((acc, cur) => {
		return acc + cur;
	});
	const baseAve = baseSum / Number(baseData.length);

	const comparingSum = comparingData.reduce((acc, cur) => {
		return acc + cur;
	});
	const comparingAve = comparingSum / Number(comparing.length);

	const ymax = Math.max(baseAve, comparingAve);

	// const baseDataCopy = [...baseData];
	// const comparingDataCopy = [...comparingData];

	// baseDataCopy.sort((a, b) => a - b);
	// comparingDataCopy.sort((a, b) => a - b);

	// const baseThirdQuartile =
	// 	baseDataCopy[Math.ceil((Number(baseDataCopy.length) * 3) / 4)];
	// const comparingThirdQuartile =
	// 	comparingDataCopy[
	// 		Math.ceil((Number(comparingDataCopy.length) * 3) / 4)
	// 	];

	// const ymax = Math.max(baseThirdQuartile, comparingThirdQuartile);

	const data = {
		// x 軸のラベル
		labels,
		datasets: [
			{
				label: "Base Clones",
				data: baseData,
				backgroundColor: "rgba(255, 99, 132, 0.5)"
			},
			{
				label: "Comparing",
				data: comparingData,
				backgroundColor: "rgba(53, 162, 235, 0.5)"
			},
			{
				label: "Match Clones",
				data: matchData,
				backgroundColor: "rgba(167, 87, 168, 0.5)"
			}
		]
	};

	const options = {
		responsive: false,
		scales: {
			yAxis: {
				max: ymax + 20
			}
			// xAxis: {
			// 	// display: false
			// 	stacked: true
			// },
			// yBase: {
			// 	max: ymax + 20
			// 	// stacked: true
			// },
			// yComparing: {
			// 	max: ymax + 20
			// }
		}
	};

	return (
		<div>
			<div>
				<Box>
					<Grid container spacing={2} alignItems="center">
						<Grid item>
							<Typography>{state.xPath}</Typography>
							<Typography>{state.yPath}</Typography>
						</Grid>
						<Grid item>
							<Button
								disabled={state.disabled}
								variant="contained"
								color="secondary"
								onClick={onCompareClick}
							>
								Compare Files
							</Button>
						</Grid>
					</Grid>
				</Box>
				<Divider />
				<Box mt={2}>
					<DiffGrid onCellClick={onCellClick} />
				</Box>
			</div>
			<div>
				<Bar
					options={options}
					data={data}
					width={
						6 *
						10 *
						Number(Object.keys(result.clonePairIdsPerFile).length)
					}
					height={1000}
				/>
			</div>
		</div>
	);
};

export default DiffPlot;
