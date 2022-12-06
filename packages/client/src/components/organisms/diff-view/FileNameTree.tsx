import React from "react";
import { useParams, useHistory } from "react-router-dom";
import { Box, BoxProps, makeStyles, useTheme } from "@material-ui/core";
import { TreeItem, TreeItemProps, TreeView } from "@material-ui/lab";
import {
	ChevronDown,
	ChevronRight,
	Folder,
	File as FileIcon
} from "mdi-material-ui";

import File from "common/all/types/File";
import ClonePair from "common/all/types/ClonePair";
import FilePath from "common/all/types/FilePath";
import FileId from "common/all/types/FileId";
import Fragment from "common/all/types/Fragment";

import useMappingResult from "hooks/useMappingResult";
import useMatchResult from "hooks/useMatchResult";

type FileNode = {
	id: string;
};

type DirectoryNode = {
	id: string;
	directories: {
		[key: string]: DirectoryNode;
	};
	files: {
		[key: string]: FileNode;
	};
};

const insertFile = (root: DirectoryNode, paths: string[]): void => {
	let parent = root;
	const traces: string[] = [];

	// create nodes recursively
	paths.slice(0, paths.length - 1).forEach((path) => {
		traces.push(path);
		if (!(path in parent.directories)) {
			parent.directories[path] = {
				id: traces.join("/"),
				directories: {},
				files: {}
			};
		}
		parent = parent.directories[path];
	});

	// insert file node
	const fileName = paths[paths.length - 1];
	parent.files[fileName] = {
		id: [...traces, fileName].join("/")
	};
};

const isMergeable = (current: DirectoryNode): boolean =>
	Object.keys(current.files).length === 0 &&
	Object.keys(current.directories).length === 1;

const optimizeTree = (root: DirectoryNode): DirectoryNode => {
	const startingNodes = [root];

	while (startingNodes.length > 0) {
		const start = startingNodes.pop() as DirectoryNode;
		const children = Object.entries(start.directories);

		while (children.length > 0) {
			let [name, toNode] = children.pop() as [string, DirectoryNode];
			const mergingPaths = [name];
			console.log(`check from ${mergingPaths[0]}`);

			while (isMergeable(toNode)) {
				[name] = Object.keys(toNode.directories);
				mergingPaths.push(name);
				toNode = toNode.directories[name];
			}
			console.log(`	${name} is not mergeable`);

			if (mergingPaths.length > 1) {
				const merged = mergingPaths.join("/");
				start.directories[merged] = toNode;
				delete start.directories[mergingPaths[0]];
				console.log(`	merged: ${mergingPaths}`);
				console.log(`	deleted: ${mergingPaths[0]}`);

				startingNodes.push(
					toNode
				); /*
				Object.values(toNode.directories).forEach((node) =>
					startingNodes.push(node)
				); */
			} else {
				startingNodes.push(toNode);
				console.log(`	pushed: ${toNode.id}`);
			}
		}
	}
	return root;
};

type files = {
	id: number;
	path: FilePath;
}[];

const buildTree = (files: files): DirectoryNode => {
	const root: DirectoryNode = {
		id: "/",
		directories: {},
		files: {}
	};

	const list: Record<number, File> = {};
	const filesSize = files.length;
	for (let i = 0; i < filesSize; i += 1) {
		list[i] = {
			id: files[i].id as FileId,
			path: files[i].path
		}
	}

	Object.entries(list).forEach(([, file]) => {
		insertFile(root, file.path.split("/"));
	});
	return optimizeTree(root);
};

type FileNodeItemProps = TreeItemProps & {
	label: string;
	nClones: number;
};

const useStyles = makeStyles((theme) => ({
	labelRoot: {
		flex: "auto",
		minWidth: 0,
		display: "flex",
		flexDirection: "row",
		paddingRight: theme.spacing(2)
	},
	labelText: {
		fontWeight: "inherit"
	}
}));

/*
const labelSx: BoxProps["sx"] = {
	flex: "auto",
	overflow: "hidden",
	textOverflow: "ellipsis",
	minWidth: 0
};

const nClonesSx: BoxProps["sx"] = {
	flex: "none",
	marginLeft: 2,
	boxSizing: "border-box"
};
*/

const FileNodeItem: React.FunctionComponent<FileNodeItemProps> = ({
	label,
	nClones,
	...rest
}) => {
	const classes = useStyles(useTheme());

	return (
		<TreeItem
			classes={{ label: classes.labelRoot }}
			endIcon={<FileIcon />}
			label={
				<>
					<Box
						flex="auto"
						overflow="hidden"
						textOverflow="ellipsis"
						minWidth={0}
					>
						{label}
					</Box>
					<Box flex="none" marginLeft={2} boxSizing="border-box">
						{nClones}
					</Box>
				</>
			}
			{...rest}
		/>
	);
};

const renderFile = (name: string, node: FileNode) => (
	<FileNodeItem
		key={node.id}
		nodeId={node.id}
		label={name}
		nClones={node.nClones}
	/>
);

const renderTree = (
	label: string,
	parentName: string,
	parent: DirectoryNode
) => (
	<TreeItem
		key={parent.id}
		classes={{ label }}
		nodeId={parent.id}
		label={parentName}
	>
		{Object.entries(parent.directories)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([name, node]) => renderTree(label, name, node))}
		{Object.entries(parent.files)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([name, node]) => renderFile(name, node))}
	</TreeItem>
);

const cumulativeJoin = (sum: string) => (value: string) => {
	sum = `${sum}/${value}`;
	return sum;
};

const openSelectedFile = (selectedFile: string) => {
	if (!selectedFile) {
		return [];
	}

	const [head, ...tail] = selectedFile.split("/");
	return [head, ...tail.map(cumulativeJoin(head))];
};

type Props = {
	file: {
		id: number;
		path: FilePath;
	}[];
};

const useParentStyle = makeStyles((theme) => ({
	root: {
		fontSize: "70%",
		width: "100%"
	},
	label: {
		minWidth: 0,
		overflow: "hidden",
		textOverflow: "ellipsis"
	}
}));

const FileNameTree: React.FunctionComponent<Props> = ({ file }) => {
	const classes = useParentStyle(useTheme());

	const history = useHistory();
	const { project, historyId, resultId } = useParams<
		Record<"project" | "historyId" | "resultId", string>
	>();

	const { result } = useMappingResult();
	const files = file;
	// const [result, dispatch] = useMatchResult();

	const root = React.useMemo(() => {
		return buildTree(files);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const [expanded, setExpanded] = React.useState<string[]>(() =>
		openSelectedFile(files.path));
	);

	const onNodeToggle = React.useCallback(
		(event: React.ChangeEvent<{}>, nodeIds: string[]) =>
			setExpanded(nodeIds),
		[setExpanded]
	);

	const onNodeSelect = React.useCallback(
		(event: React.ChangeEvent<{}>, nodeId: string) => {
			history.push(
				`/home/${project}/history/${historyId}/result/${resultId}/${nodeId}`
			);
			dispatch({
				type: "set-base-file",
				payload: {
					path: nodeId
				}
			});
		},
		[dispatch]
	);

	const tree = React.useMemo(() => {
		return (
			<>
				{Object.entries(root.directories)
					.sort(([a], [b]) => a.localeCompare(b))
					.map(([name, node]) =>
						renderTree(classes.label, name, node)
					)}
				{Object.entries(root.files)
					.sort(([a], [b]) => a.localeCompare(b))
					.map(([name, node]) => renderFile(name, node))}
			</>
		);
	}, [classes.label]);

	return (
		<TreeView
			className={classes.root}
			defaultParentIcon={<Folder />}
			defaultCollapseIcon={<ChevronDown />}
			defaultExpandIcon={<ChevronRight />}
			expanded={expanded}
			selected={result.base.path}
			onNodeToggle={onNodeToggle}
			onNodeSelect={onNodeSelect}
		>
			{tree}
		</TreeView>
	);
};

export default FileNameTree;
