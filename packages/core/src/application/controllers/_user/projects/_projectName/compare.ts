import express from "express";
import * as fs from "fs";
import * as path from "path";

import useAsync from "common/server-only/middlewares/useAsync";
import ProjectService from "domain/services/ProjectService";
import HistoryId from "common/all/types/HistoryId";
import DetectionResult from "common/all/types/DetectionResult";
import EDetectionResult, {
	convertE,
	MappingResult
} from "common/all/types/EDetectionResult";
import FileId from "common/all/types/FileId";
import ClonePairId from "common/all/types/ClonePairId";
import Fragment from "common/all/types/Fragment";
import ClonePair from "common/all/types/ClonePair";
import { Registry } from "types/registry";
import {
	createEntityId,
	InternalHistoryEntityId
} from "common/server-only/value-objects/EntityId";
import ProjectRepository from "infrastructure/repositories/ProjectRepository";
import compareFragment from "common/all/utils/compareFragment";
import { clone } from "io-ts-types";
import { badRequest } from "@hapi/boom";

const router = express.Router({ mergeParams: true });

const cv = (f1: Fragment, f2: Fragment): boolean => {
	return (
		(Math.min(f1.end, f2.end) - Math.max(f1.begin, f2.begin) + 1) /
			(f2.end - f2.begin + 1) >
		0.6
	);
};

const cmatch = (cp1: ClonePair, cp2: ClonePair): boolean => {
	return cv(cp1.f1, cp2.f1) && cv(cp1.f2, cp2.f2);
};

const cfmatch = (cp1: ClonePair, cp2: ClonePair): boolean =>
	cmatch(cp1, cp2) && cmatch(cp2, cp1);

const map = (
	base: EDetectionResult,
	comparing: EDetectionResult
): MappingResult => {
	let fileCtr = 0;
	const allFiles: MappingResult["allFiles"] = {};
	const comparingToAllF: MappingResult["comparingToAllF"] = {};
	const baseToComparing: MappingResult["baseToComparing"] = {};
	const comparingToBase: MappingResult["comparingToBase"] = {};
	const allGrids: MappingResult["allGrids"] = {};
	const clonesPerFile: MappingResult["clonesPerFile"] = {};
	let baseFileCtr = 0;
	console.log("Object");
	console.log(JSON.stringify(Object));
	Object.entries(base.files).forEach(([id, f]) => {
		allFiles[fileCtr] = { path: f, base: Number(id) as FileId };
		clonesPerFile[fileCtr] = { path: f, sum: 0, matchRate: 0 };
		allGrids[fileCtr] = {};
		fileCtr += 1;
	});
	baseFileCtr = fileCtr;

	Object.entries(comparing.files).forEach(([id, f]) => {
		const file = Object.entries(allFiles).find(([, ff]) => ff.path === f);
		console.log("file");
		console.log(file);
		if (file) {
			comparingToAllF[Number(id)] = file[1].base;
			allFiles[Number(file[0])] = {
				...file[1],
				comparing: Number(id) as FileId
			};
		} else {
			allFiles[fileCtr] = { path: f, comparing: Number(id) as FileId };
			clonesPerFile[fileCtr] = { path: f, sum: 0, matchRate: 0 };
			allGrids[fileCtr] = {};
			comparingToAllF[Number(id)] = fileCtr as FileId;
			fileCtr += 1;
		}
	});

	const baseCloneSet: Fragment[][] = [];
	Object.entries(base.clonePairs).forEach(([, bcp]) => {
		if (baseCloneSet.length === 0) {
			const clones: Fragment[] = [];
			clones.push(bcp.f1 as Fragment);
			clones.push(bcp.f2 as Fragment);
			baseCloneSet.push(clones);
		} else {
			const size = baseCloneSet.length;
			let setFlag = false;
			for (let i = 0; i < size; i += 1) {
				for (let j = 0; j < baseCloneSet[i].length; j += 1) {
					if (
						JSON.stringify(baseCloneSet[i][j]) ===
						JSON.stringify(bcp.f1)
					) {
						let flag = false;
						for (let k = j; k < baseCloneSet[i].length; k += 1) {
							if (
								JSON.stringify(baseCloneSet[i][k]) ===
								JSON.stringify(bcp.f2)
							) {
								flag = true;
								break;
							}
						}
						if (!flag) {
							baseCloneSet[i].push(bcp.f2 as Fragment);
						}
						setFlag = true;
						break;
					} else if (
						JSON.stringify(baseCloneSet[i][j]) ===
						JSON.stringify(bcp.f2)
					) {
						let flag = false;
						for (let k = j; k < baseCloneSet[i].length; k += 1) {
							if (
								JSON.stringify(baseCloneSet[i][k]) ===
								JSON.stringify(bcp.f1)
							) {
								flag = true;
								break;
							}
						}
						if (!flag) {
							baseCloneSet[i].push(bcp.f1 as Fragment);
						}
						setFlag = true;
						break;
					}
				}
				if (setFlag) {
					break;
				}
			}
			if (!setFlag) {
				const clones: Fragment[] = [];
				clones.push(bcp.f1 as Fragment);
				clones.push(bcp.f2 as Fragment);
				baseCloneSet.push(clones);
			}
		}
	});

	const baseCloneSetSize = baseCloneSet.length;
	for (let i = baseCloneSetSize - 1; i > -1; i -= 1) {
		const fragment = baseCloneSet[i][0];
		for (let j = i - 1; j > -1; j -= 1) {
			for (let k = 0; k < baseCloneSet[j].length; k += 1)
				if (
					JSON.stringify(baseCloneSet[j][k]) ===
					JSON.stringify(fragment)
				) {
					baseCloneSet.splice(i, 1);
					break;
				}
		}
	}

	const comparingCloneSet: Fragment[][] = [];
	Object.entries(comparing.clonePairs).forEach(([, ccp]) => {
		if (comparingCloneSet.length === 0) {
			const clones: Fragment[] = [];
			clones.push(ccp.f1 as Fragment);
			clones.push(ccp.f2 as Fragment);
			comparingCloneSet.push(clones);
		} else {
			const size = comparingCloneSet.length;
			let setFlag = false;
			for (let i = 0; i < size; i += 1) {
				for (let j = 0; j < comparingCloneSet[i].length; j += 1) {
					if (
						JSON.stringify(comparingCloneSet[i][j]) ===
						JSON.stringify(ccp.f1)
					) {
						let flag = false;
						for (
							let k = j;
							k < comparingCloneSet[i].length;
							k += 1
						) {
							if (
								JSON.stringify(comparingCloneSet[i][k]) ===
								JSON.stringify(ccp.f2)
							) {
								flag = true;
								break;
							}
						}
						if (!flag) {
							comparingCloneSet[i].push(ccp.f2 as Fragment);
						}
						setFlag = true;
						break;
					} else if (
						JSON.stringify(comparingCloneSet[i][j]) ===
						JSON.stringify(ccp.f2)
					) {
						let flag = false;
						for (
							let k = j;
							k < comparingCloneSet[i].length;
							k += 1
						) {
							if (
								JSON.stringify(comparingCloneSet[i][k]) ===
								JSON.stringify(ccp.f1)
							) {
								flag = true;
								break;
							}
						}
						if (!flag) {
							comparingCloneSet[i].push(ccp.f1 as Fragment);
						}
						setFlag = true;
						break;
					}
				}
				if (setFlag) {
					break;
				}
			}
			if (!setFlag) {
				const clones: Fragment[] = [];
				clones.push(ccp.f1 as Fragment);
				clones.push(ccp.f2 as Fragment);
				comparingCloneSet.push(clones);
			}
		}
	});

	const comparingCloneSetSize = comparingCloneSet.length;
	for (let i = comparingCloneSetSize - 1; i > -1; i -= 1) {
		const fragment = comparingCloneSet[i][0];
		for (let j = i - 1; j > -1; j -= 1) {
			for (let k = 0; k < comparingCloneSet[j].length; k += 1)
				if (
					JSON.stringify(comparingCloneSet[j][k]) ===
					JSON.stringify(fragment)
				) {
					comparingCloneSet.splice(i, 1);
					break;
				}
		}
	}

	for (let i = 0; i < baseFileCtr; i += 1) {
		const baseClone: Fragment[] = [];
		const baseCloneSets: Fragment[][] = [];
		Object.entries(base.clonePairs).forEach(([, bcp]) => {
			const baseCloneSize = baseClone.length;
			if (bcp.f1.file === i) {
				let f1Flag = false;
				if (baseCloneSize > 0) {
					for (let j = 0; j < baseCloneSize; j += 1) {
						if (
							JSON.stringify(bcp.f1) ===
							JSON.stringify(baseClone[j])
						) {
							f1Flag = true;
							break;
						}
					}
				}
				if (!f1Flag) {
					baseClone.push(bcp.f1 as Fragment);
				}
			}
			if (bcp.f2.file === i) {
				let f2Flag = false;
				if (baseCloneSize > 0) {
					for (let j = 0; j < baseCloneSize; j += 1) {
						if (
							JSON.stringify(bcp.f2) ===
							JSON.stringify(baseClone[j])
						) {
							f2Flag = true;
							break;
						}
					}
				}
				if (!f2Flag) {
					baseClone.push(bcp.f2 as Fragment);
				}
			}
		});
		const size = baseCloneSet.length;
		for (let j = 0; j < size; j += 1) {
			if (baseCloneSet[j][0].file > i) {
				break;
			}
			for (let k = 0; k < baseCloneSet[j].length; k += 1) {
				if (baseCloneSet[j][k].file === i) {
					const frag1 = baseCloneSet[j][0];
					const frag2 = baseCloneSet[j][k];
					if (k !== 0) {
						baseCloneSet[j].splice(0, 1, frag2);
						baseCloneSet[j].splice(k, 1, frag1);
					}
					const cloneSet = [...baseCloneSet[j]];
					if (k !== 0) {
						baseCloneSet[j].splice(0, 1, frag1);
						baseCloneSet[j].splice(k, 1, frag2);
					}
					baseCloneSets.push(cloneSet);
					break;
				} else if (baseCloneSet[j][k].file > i) {
					break;
				}
			}
		}
		clonesPerFile[i] = {
			...clonesPerFile[i],
			baseClones: baseClone,
			baseCloneSet: baseCloneSets
		};
	}

	const allFilesSize = Object.keys(allFiles).length;
	for (let i = 0; i < allFilesSize; i += 1) {
		const comparingClone: Fragment[] = [];
		const comparingCloneSets: Fragment[][] = [];
		const cFileId = allFiles[i].comparing;
		if (cFileId != null) {
			Object.entries(comparing.clonePairs).forEach(([, ccp]) => {
				const comparingCloneSize = comparingClone.length;
				if (ccp.f1.file === cFileId) {
					let f1Flag = false;
					if (comparingCloneSize > 0) {
						for (let j = 0; j < comparingCloneSize; j += 1) {
							if (
								JSON.stringify(ccp.f1) ===
								JSON.stringify(comparingClone[j])
							) {
								f1Flag = true;
								break;
							}
						}
					}
					if (!f1Flag) {
						comparingClone.push(ccp.f1);
					}
				}
				if (ccp.f2.file === cFileId) {
					let f2Flag = false;
					if (comparingCloneSize > 0) {
						for (let j = 0; j < comparingCloneSize; j += 1) {
							if (
								JSON.stringify(ccp.f2) ===
								JSON.stringify(comparingClone[j])
							) {
								f2Flag = true;
								break;
							}
						}
					}
					if (!f2Flag) {
						comparingClone.push(ccp.f2);
					}
				}
			});
			const size = comparingCloneSet.length;
			for (let j = 0; j < size; j += 1) {
				if (comparingCloneSet[j][0].file > cFileId) {
					break;
				}
				for (let k = 0; k < comparingCloneSet[j].length; k += 1) {
					if (comparingCloneSet[j][k].file === cFileId) {
						const frag1 = comparingCloneSet[j][0];
						const frag2 = comparingCloneSet[j][k];
						if (k !== 0) {
							comparingCloneSet[j].splice(0, 1, frag2);
							comparingCloneSet[j].splice(k, 1, frag1);
						}
						const cloneSet = [...comparingCloneSet[j]];
						if (k !== 0) {
							comparingCloneSet[j].splice(0, 1, frag1);
							comparingCloneSet[j].splice(k, 1, frag2);
						}
						comparingCloneSets.push(cloneSet);
						break;
					} else if (comparingCloneSet[j][k].file > cFileId) {
						break;
					}
				}
			}
			clonesPerFile[i] = {
				...clonesPerFile[i],
				comparingClones: comparingClone,
				comparingCloneSet: comparingCloneSets
			};
		}
	}

	Object.entries(clonesPerFile).forEach(([id, c]) => {
		const matchBaseClone: Fragment[] = [];
		const matchComparingClone: Fragment[] = [];
		const unmatchedBaseClone: Fragment[] = [];
		const unmatchedComparingClone: Fragment[] = [];
		const unmatchedBaseCloneSet: Fragment[][] = [];
		const unmatchedComparingCloneSet: Fragment[][] = [];
		const matchBaseCloneSet: Fragment[][] = [];
		const matchComparingCloneSet: Fragment[][] = [];
		const matchBase: Fragment[] = [];
		const matchComparing: Fragment[] = [];
		let sums = 0;
		let match = 0;
		if (
			c.baseClones &&
			c.comparingClones &&
			c.baseCloneSet &&
			c.comparingCloneSet
		) {
			const baseCloneSize = c.baseClones.length;
			const comparingCloneSize = c.comparingClones.length;
			const cloneSetSizeB = c.baseCloneSet.length;
			const cloneSetSizeC = c.comparingCloneSet.length;
			for (let i = 0; i < baseCloneSize; i += 1) {
				for (let j = 0; j < comparingCloneSize; j += 1) {
					if (
						cv(c.baseClones[i], c.comparingClones[j]) &&
						cv(c.comparingClones[j], c.baseClones[i])
					) {
						matchBaseClone.push(c.baseClones[i]);
						matchComparingClone.push(c.comparingClones[j]);

						let flag = false;
						let tmp: Fragment[] | null = null;
						for (let k = 0; k < cloneSetSizeB; k += 1) {
							if (c.baseCloneSet[k].includes(c.baseClones[i])) {
								if (matchBaseCloneSet.length !== 0) {
									if (
										matchBaseCloneSet.includes(
											c.baseCloneSet[k]
										)
									) {
										flag = true;
										tmp = [...c.baseCloneSet[k]];
									} else {
										matchBaseCloneSet.push(
											c.baseCloneSet[k]
										);
										matchBase.push(c.baseClones[i]);
									}
								} else {
									matchBaseCloneSet.push(c.baseCloneSet[k]);
									matchBase.push(c.baseClones[i]);
								}
								break;
							}
						}
						for (let k = 0; k < cloneSetSizeC; k += 1) {
							if (
								c.comparingCloneSet[k].includes(
									c.comparingClones[j]
								)
							) {
								if (flag && tmp) {
									if (
										matchComparingCloneSet.includes(
											c.comparingCloneSet[k]
										)
									) {
										break;
									} else {
										matchBaseCloneSet.push(tmp);
										matchComparingCloneSet.push(
											c.comparingCloneSet[k]
										);
										matchComparing.push(
											c.comparingClones[j]
										);
										break;
									}
								} else {
									matchComparingCloneSet.push(
										c.comparingCloneSet[k]
									);
									matchComparing.push(c.comparingClones[j]);
								}
								break;
							}
						}
					}
				}
			}
			if (baseCloneSize >= comparingCloneSize) {
				for (let i = 0; i < baseCloneSize; i += 1) {
					if (!matchBaseClone.includes(c.baseClones[i])) {
						unmatchedBaseClone.push(c.baseClones[i]);
					}
					if (i < comparingCloneSize) {
						if (
							!matchComparingClone.includes(c.comparingClones[i])
						) {
							unmatchedComparingClone.push(c.comparingClones[i]);
						}
					}
				}
				match = (matchBaseClone.length / baseCloneSize) * 100;
			} else if (baseCloneSize < comparingCloneSize) {
				for (let i = 0; i < comparingCloneSize; i += 1) {
					if (!matchComparingClone.includes(c.comparingClones[i])) {
						unmatchedComparingClone.push(c.comparingClones[i]);
					}
					if (i < baseCloneSize) {
						if (!matchBaseClone.includes(c.baseClones[i])) {
							unmatchedBaseClone.push(c.baseClones[i]);
						}
					}
				}
				match = (matchComparingClone.length / comparingCloneSize) * 100;
			}
			if (cloneSetSizeB >= cloneSetSizeC) {
				for (let i = 0; i < cloneSetSizeB; i += 1) {
					if (!matchBaseCloneSet.includes(c.baseCloneSet[i])) {
						unmatchedBaseCloneSet.push(c.baseCloneSet[i]);
					}
					if (i < cloneSetSizeC) {
						if (
							!matchComparingCloneSet.includes(
								c.comparingCloneSet[i]
							)
						) {
							unmatchedComparingCloneSet.push(
								c.comparingCloneSet[i]
							);
						}
					}
				}
			} else if (cloneSetSizeB < cloneSetSizeC) {
				for (let i = 0; i < cloneSetSizeC; i += 1) {
					if (
						!matchComparingCloneSet.includes(c.comparingCloneSet[i])
					) {
						unmatchedComparingCloneSet.push(c.comparingCloneSet[i]);
					}
					if (i < cloneSetSizeB) {
						if (!matchBaseCloneSet.includes(c.baseCloneSet[i])) {
							unmatchedBaseCloneSet.push(c.baseCloneSet[i]);
						}
					}
				}
			}
			sums =
				unmatchedBaseClone.length +
				unmatchedComparingClone.length +
				matchBaseClone.length;
		} else if (
			c.baseClones === undefined &&
			c.comparingClones &&
			c.comparingCloneSet
		) {
			const comparingCloneSize = c.comparingClones.length;
			const cloneSetSizeC = c.comparingCloneSet.length;
			if (comparingCloneSize >= cloneSetSizeC) {
				for (let i = 0; i < comparingCloneSize; i += 1) {
					unmatchedComparingClone.push(c.comparingClones[i]);
					if (i < cloneSetSizeC) {
						unmatchedComparingCloneSet.push(c.comparingCloneSet[i]);
					}
				}
			} else {
				for (let i = 0; i < cloneSetSizeC; i += 1) {
					unmatchedComparingCloneSet.push(c.comparingCloneSet[i]);
					if (i < comparingCloneSetSize) {
						unmatchedComparingClone.push(c.comparingClones[i]);
					}
				}
			}
			sums = c.comparingClones.length;
		} else if (
			c.baseClones &&
			c.comparingClones === undefined &&
			c.baseCloneSet
		) {
			const baseCloneSize = c.baseClones.length;
			const cloneSetSizeB = c.baseCloneSet.length;
			if (baseCloneSize >= cloneSetSizeB) {
				for (let i = 0; i < baseCloneSize; i += 1) {
					unmatchedBaseClone.push(c.baseClones[i]);
					if (i < cloneSetSizeB) {
						unmatchedBaseCloneSet.push(c.baseCloneSet[i]);
					}
				}
			} else {
				for (let i = 0; i < cloneSetSizeB; i += 1) {
					unmatchedBaseCloneSet.push(c.baseCloneSet[i]);
					if (i < baseCloneSetSize) {
						unmatchedBaseClone.push(c.baseClones[i]);
					}
				}
			}
			sums = c.baseClones.length;
		}
		unmatchedBaseClone.sort((p1, p2) => compareFragment(p1, p2));
		unmatchedComparingClone.sort((p1, p2) => compareFragment(p1, p2));
		clonesPerFile[Number(id)] = {
			...clonesPerFile[Number(id)],
			matchBaseClones: matchBaseClone,
			matchComparingClones: matchComparingClone,
			unmatchedBaseClones: unmatchedBaseClone,
			unmatchedComparingClones: unmatchedComparingClone,
			matchBaseCloneSets: matchBaseCloneSet,
			matchComparingCloneSets: matchComparingCloneSet,
			unmatchedBaseCloneSets: unmatchedBaseCloneSet,
			unmatchedComparingCloneSets: unmatchedComparingCloneSet,
			matchBases: matchBase,
			matchComparings: matchComparing,
			sum: sums,
			matchRate: match
		};
	});

	Object.entries(allFiles).forEach(([y, yf]) => {
		Object.entries(allFiles).forEach(([x, xf]) => {
			const xx = Number(x);
			const yy = Number(y);

			if (xx <= yy) {
				let baseCP: ClonePairId[] = [];
				let comparingCP: ClonePairId[] = [];

				if (yf.base != null && xf.base != null) {
					const f1 = Math.min(yf.base, xf.base);
					const f2 = Math.max(yf.base, xf.base);

					baseCP = Object.entries(base.clonePairs)
						.filter(
							([, cp]) => cp.f1.file === f1 && cp.f2.file === f2
						)
						.map(([id]) => Number(id) as ClonePairId);
				}

				if (yf.comparing != null && xf.comparing != null) {
					const f1 = Math.min(yf.comparing, xf.comparing);
					const f2 = Math.max(yf.comparing, xf.comparing);

					comparingCP = Object.entries(comparing.clonePairs)
						.filter(
							([, cp]) => cp.f1.file === f1 && cp.f2.file === f2
						)
						.map(([id]) => Number(id) as ClonePairId);
				}
				if (baseCP.length > 0 || comparingCP.length > 0) {
					allGrids[yy][xx] = {
						base: baseCP,
						comparing: comparingCP
					};
				}
			}
		});
	});

	Object.values(allGrids).forEach((row) => {
		Object.values(row).forEach((grid) => {
			grid.base.forEach((bcp) => {
				grid.comparing.forEach((ccp) => {
					const bbcp = base.clonePairs[bcp];
					const cccp = comparing.clonePairs[ccp];
					if (cfmatch(bbcp, cccp)) {
						if (bcp in baseToComparing) {
							const v = baseToComparing[bcp];
							v.push(ccp);
							baseToComparing[bcp] = v;
						} else {
							baseToComparing[bcp] = [ccp];
						}

						if (ccp in comparingToBase) {
							const v = comparingToBase[ccp];
							v.push(bcp);
							comparingToBase[ccp] = v;
						} else {
							comparingToBase[ccp] = [bcp];
						}
					}
				});
			});
		});
	});

	return {
		base,
		comparing,
		comparingToAllF,
		baseToComparing,
		comparingToBase,
		allFiles,
		allGrids,
		clonesPerFile
	};
};

const defineRoute = (registry: Registry): express.Router => {
	// for checking directory path and revision
	router.get<
		{ userEntityId: string; projectName: string },
		MappingResult,
		unknown,
		{
			base?: string;
			comparing?: string;
		}
	>(
		"/",
		useAsync(async (req, res) => {
			const { userEntityId, projectName } = req.params;
			const { base, comparing } = req.query;
			if (typeof base !== "string" || typeof comparing !== "string") {
				res.sendStatus(403);
				return;
			}

			const [baseHistoryId, baseResultId] = base.split("-");
			const [comparingHistoryId, comparingResultId] = comparing.split(
				"-"
			);

			const project = await ProjectService.findProjectByName(
				createEntityId(userEntityId),
				projectName
			);

			const [baseR, comparingR] = (
				await Promise.all([
					ProjectRepository.readResult(
						project.ownerId,
						project.internalProjectEntityId,
						createEntityId(
							baseHistoryId
						) as InternalHistoryEntityId,
						baseResultId
					),
					ProjectRepository.readResult(
						project.ownerId,
						project.internalProjectEntityId,
						createEntityId(
							comparingHistoryId
						) as InternalHistoryEntityId,
						comparingResultId
					)
				])
			).map((r) => convertE(r));

			res.send(map(baseR, comparingR));
		})
	);
	return router;
};

export default defineRoute;
