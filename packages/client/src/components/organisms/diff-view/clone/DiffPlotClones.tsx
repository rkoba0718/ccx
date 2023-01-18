import React, { useState, useEffect, useRef } from "react";
import { Typography, makeStyles } from "@material-ui/core";
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	BarElement,
	PointElement,
	LineElement,
	Title,
	Tooltip,
	Legend,
	LineController,
	BarController
} from "chart.js";
import { Chart } from "react-chartjs-2";

import SplitPane from "components/atoms/SplitPane";
import PaneWithTitle from "components/atoms/PaneWithTitle";
import DiffView from "components/organisms/diff-view/clone/DiffView";
import useMappingResult from "hooks/useMappingResult";

ChartJS.register(
	CategoryScale,
	LinearScale,
	BarElement,
	LineElement,
	PointElement,
	Title,
	Tooltip,
	Legend,
	LineController,
	BarController
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

	const chartRef = useRef(null);

	let sums = 0;

	const sorts: {
		id: number;
		sum: number;
		rate: number;
	}[] = [];

	Object.entries(result.clonesPerFile).forEach(([id, c]) => {
		sums += c.sum;
		sorts.push({
			id: Number(id),
			sum: c.sum,
			rate: c.matchRate
		});
	});

	sorts.sort((a, b) => {
		if (a.rate > b.rate) {
			return 1;
		}
		if (a.rate < b.rate) {
			return -1;
		}
		if (a.sum > b.sum) {
			return -1;
		}
		if (a.sum < b.sum) {
			return 1;
		}
		return 0;
	});

	const c = result.clonesPerFile;
	const labels: string[] = [];
	const baseData: number[] = [];
	const comparingData: number[] = [];
	const matchData: number[] = [];
	const rateData: number[] = [];
	const sumsSize = sorts.length;
	for (let i = 0; i < sumsSize; i += 1) {
		labels.push(c[sorts[i].id].path);
		const baseClone = c[sorts[i].id].unmatchedBaseClones;
		const comparingClone = c[sorts[i].id].unmatchedComparingClones;
		const matchClone = c[sorts[i].id].matchBaseClones;
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
		rateData.push(c[sorts[i].id].matchRate);
	}

	const ymax = sums / Object.keys(c).length;

	const data = {
		// x 軸のラベル
		labels,
		datasets: [
			{
				type: "bar",
				yAxisID: "y",
				label: "Match Clones",
				data: matchData,
				backgroundColor: "rgba(167, 87, 168, 0.5)"
			},
			{
				type: "bar",
				yAxisID: "y",
				label: "Base Clones",
				data: baseData,
				backgroundColor: "rgba(255, 99, 132, 0.5)"
			},
			{
				type: "bar",
				yAxisID: "y",
				label: "Comparing Clones",
				data: comparingData,
				backgroundColor: "rgba(53, 162, 235, 0.5)"
			},
			{
				type: "line",
				yAxisID: "y1",
				label: "matchRate",
				data: rateData,
				borderColor: "rgba(167, 87, 168, 0.5)",
				borderWidth: 2
			}
		]
	};

	const options = {
		responsive: false,
		scales: {
			y: {
				position: "left",
				stacked: true,
				title: {
					display: true,
					text: "Number of Clones"
				},
				max: Math.ceil(ymax + 30)
			},
			xAxis: {
				stacked: true,
				title: {
					display: true,
					text: "Files",
					align: "start"
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
				<Chart
					ref={chartRef}
					type="bar"
					data={data}
					options={options}
					width={
						2 *
						10 *
						Number(Object.keys(result.clonesPerFile).length)
					}
					height={windowDimentions.height * 0.25}
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
