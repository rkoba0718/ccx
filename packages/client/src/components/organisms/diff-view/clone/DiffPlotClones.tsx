import React, { useState, useEffect } from "react";
import { Typography, makeStyles } from "@material-ui/core";
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

import SplitPane from "components/atoms/SplitPane";
import PaneWithTitle from "components/atoms/PaneWithTitle";
import DiffView from "components/organisms/diff-view/clone/DiffView";
import useMappingResult from "hooks/useMappingResult";

ChartJS.register(
	CategoryScale,
	LinearScale,
	BarElement,
	Title,
	Tooltip,
	Legend
);

const useStyles = makeStyles({
	root: {
		"& > * > *": {
			width: "100%",
			height: "100%",
			overflowX: "scroll",
			overflowY: "scroll"
		}
	},
	title: {
		display: "inline-block",
		verticalAlign: "middle",
		width: "100%"
	}
});

type Props = {
	project: string;
};
const DiffPlotClones: React.FunctionComponent<Props> = ({ project }) => {
	const classes = useStyles();

	const { base, comparing, revision, result } = useMappingResult();

	const diffs: {
		id: number;
		diff: number;
	}[] = [];

	Object.entries(result.clonesPerFile).forEach(([id, c]) => {
		diffs.push({
			id: Number(id),
			diff: c.diff
		});
	});

	diffs.sort((a, b) => b.diff - a.diff);

	const c = result.clonesPerFile;
	const labels: string[] = [];
	const baseData: number[] = [];
	const comparingData: number[] = [];
	const matchData: number[] = [];
	const diffsSize = diffs.length;
	for (let i = 0; i < diffsSize; i += 1) {
		labels.push(c[diffs[i].id].path);
		const baseClone = c[diffs[i].id].baseClones;
		const comparingClone = c[diffs[i].id].comparingClones;
		const matchClone = c[diffs[i].id].matchBaseClones;
		if (baseClone) {
			baseData.push(baseClone.length);
		} else {
			baseData.push(0);
		}
		if (comparingClone) {
			comparingData.push(comparingClone.length);
		} else {
			comparingData.push(0);
		}
		if (matchClone) {
			matchData.push(matchClone.length);
		} else {
			matchData.push(0);
		}
	}

	const baseSum = baseData.reduce((acc, cur) => {
		return acc + cur;
	});
	const baseAve = baseSum / Number(baseData.length);

	const comparingSum = comparingData.reduce((acc, cur) => {
		return acc + cur;
	});
	const comparingAve = comparingSum / Number(comparing.length);

	const ymax = Math.max(baseAve, comparingAve);

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
				label: "Comparing Clones",
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
				title: {
					display: true,
					text: "Number of Clones"
				},
				max: Math.ceil(ymax + 60)
			},
			xAxis: {
				title: {
					display: true,
					text: "Files"
				},
				ticks: {
					display: false
				}
			}
		}
	};

	const getWindowDimensions = () => {
		const { innerWidth: width, innerHeight: height } = window;
		return {
			width,
			height
		};
	};

	const [windowDimentions, setWindowDimentions] = useState(
		getWindowDimensions()
	);

	useEffect(() => {
		const onResize = () => {
			setWindowDimentions(getWindowDimensions());
		};
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, []);

	return (
		<SplitPane
			className={classes.root}
			allowResize
			split="horizontal"
			defaultSize="30%"
		>
			<PaneWithTitle
				title={
					<Typography
						className={classes.title}
						noWrap
						variant="caption"
					>
						Bar Graph
					</Typography>
				}
			>
				<Bar
					options={options}
					data={data}
					width={
						3 *
						10 *
						Number(Object.keys(result.clonesPerFile).length)
					}
					height={windowDimentions.height * 0.23}
				/>
			</PaneWithTitle>
			<PaneWithTitle
				title={
					<Typography
						className={classes.title}
						noWrap
						variant="caption"
					>
						Code View
					</Typography>
				}
			>
				<DiffView revision={revision} />
			</PaneWithTitle>
		</SplitPane>
	);
};

export default DiffPlotClones;
