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
import { clone } from "io-ts-types";
import { badRequest } from "@hapi/boom";
import { match } from "fp-ts/lib/EitherT";

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
		clonesPerFile[fileCtr] = { path: f };
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
			clonesPerFile[fileCtr] = { path: f };
			allGrids[fileCtr] = {};
			comparingToAllF[Number(id)] = fileCtr as FileId;
			fileCtr += 1;
		}
	});

	for (let i = 0; i < baseFileCtr; i += 1) {
		const baseClone: Fragment[] = [];
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
		clonesPerFile[i] = {
			...clonesPerFile[i],
			baseClones: baseClone
		};
	}

	const allFilesSize = Object.keys(allFiles).length;
	for (let i = 0; i < allFilesSize; i += 1) {
		const comparingClone: Fragment[] = [];
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
			clonesPerFile[i] = {
				...clonesPerFile[i],
				comparingClones: comparingClone
			};
		}
	}

	Object.entries(clonesPerFile).forEach(([id, c]) => {
		const matchBaseClone: Fragment[] = [];
		const matchComparingClone: Fragment[] = [];
		if (c.baseClones && c.comparingClones) {
			for (let i = 0; i < c.baseClones?.length; i += 1) {
				for (let j = 0; j < c.comparingClones?.length; j += 1) {
					if (
						cv(c.baseClones[i], c.comparingClones[j]) &&
						cv(c.comparingClones[j], c.baseClones[i])
					) {
						matchBaseClone.push(c.baseClones[i]);
						matchComparingClone.push(c.comparingClones[j]);
					}
				}
			}
		}
		clonesPerFile[Number(id)] = {
			...clonesPerFile[Number(id)],
			matchBaseClones: matchBaseClone,
			matchComparingClones: matchComparingClone
		};
	});

	for (let i = 0; i < Object.keys(clonesPerFile).length; i += 1) {
		console.log(clonesPerFile[i].baseClones);
		console.log(clonesPerFile[i].comparingClones);
		console.log(clonesPerFile[i].matchBaseClones);
		console.log(clonesPerFile[i].matchComparingClones);
		console.log("-----------");
	}

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
