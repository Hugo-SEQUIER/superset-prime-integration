import { useCallback } from "react";
import { useCollections } from "renderer/routes/_authenticated/providers/CollectionsProvider";
import {
	getStoredProjectLane,
	insertSectionInLane,
	moveProjectInLane,
	removeSectionFromLane,
	type StoredLaneEntry,
} from "../../utils/projectSidebarLane";

/** Mutations for the Projects list's sections; all per device. */
export function useProjectSidebarSections() {
	const collections = useCollections();

	const readLane = useCallback(
		() =>
			getStoredProjectLane(
				Array.from(collections.v2SidebarProjects.state.values()).map((row) => ({
					projectId: row.projectId,
					tabOrder: row.tabOrder,
					sectionId: row.sectionId,
				})),
				Array.from(collections.v2SidebarProjectSections.state.values()),
			),
		[collections],
	);

	/** Renumbers the lane in order, writing only rows that changed. */
	const writeLane = useCallback(
		(lane: readonly StoredLaneEntry[]) => {
			lane.forEach((entry, index) => {
				const tabOrder = index + 1;
				if (entry.type === "section") {
					const row = collections.v2SidebarProjectSections.get(entry.id);
					if (!row || row.tabOrder === tabOrder) return;
					collections.v2SidebarProjectSections.update(entry.id, (draft) => {
						draft.tabOrder = tabOrder;
					});
					return;
				}
				const row = collections.v2SidebarProjects.get(entry.id);
				if (
					!row ||
					(row.tabOrder === tabOrder && row.sectionId === entry.sectionId)
				) {
					return;
				}
				collections.v2SidebarProjects.update(entry.id, (draft) => {
					draft.tabOrder = tabOrder;
					draft.sectionId = entry.sectionId;
				});
			});
		},
		[collections],
	);

	const createProjectSection = useCallback(
		(options: { name?: string; fromProjectId?: string } = {}) => {
			const { name = "New section", fromProjectId } = options;
			const sectionId = crypto.randomUUID();
			const lane = insertSectionInLane(readLane(), sectionId, fromProjectId);
			collections.v2SidebarProjectSections.insert({
				sectionId,
				name,
				createdAt: new Date(),
				tabOrder: 0,
				isCollapsed: false,
				color: null,
			});
			writeLane(lane);
			return sectionId;
		},
		[collections, readLane, writeLane],
	);

	const renameProjectSection = useCallback(
		(sectionId: string, name: string) => {
			const trimmed = name.trim();
			if (!trimmed || !collections.v2SidebarProjectSections.get(sectionId)) {
				return;
			}
			collections.v2SidebarProjectSections.update(sectionId, (draft) => {
				draft.name = trimmed;
			});
		},
		[collections],
	);

	const setProjectSectionColor = useCallback(
		(sectionId: string, color: string | null) => {
			if (!collections.v2SidebarProjectSections.get(sectionId)) return;
			collections.v2SidebarProjectSections.update(sectionId, (draft) => {
				draft.color = color;
			});
		},
		[collections],
	);

	const toggleProjectSectionCollapsed = useCallback(
		(sectionId: string) => {
			if (!collections.v2SidebarProjectSections.get(sectionId)) return;
			collections.v2SidebarProjectSections.update(sectionId, (draft) => {
				draft.isCollapsed = !draft.isCollapsed;
			});
		},
		[collections],
	);

	const moveProjectToSection = useCallback(
		(projectId: string, sectionId: string | null) => {
			writeLane(moveProjectInLane(readLane(), projectId, sectionId));
			if (
				sectionId !== null &&
				collections.v2SidebarProjectSections.get(sectionId)?.isCollapsed
			) {
				collections.v2SidebarProjectSections.update(sectionId, (draft) => {
					draft.isCollapsed = false;
				});
			}
		},
		[collections, readLane, writeLane],
	);

	const deleteProjectSection = useCallback(
		(sectionId: string) => {
			if (!collections.v2SidebarProjectSections.get(sectionId)) return;
			writeLane(removeSectionFromLane(readLane(), sectionId));
			collections.v2SidebarProjectSections.delete(sectionId);
		},
		[collections, readLane, writeLane],
	);

	/** Persists a drag: the visible lane in its new order. */
	const commitProjectLane = useCallback(
		(lane: readonly StoredLaneEntry[]) => {
			writeLane(lane);
		},
		[writeLane],
	);

	return {
		commitProjectLane,
		createProjectSection,
		deleteProjectSection,
		moveProjectToSection,
		renameProjectSection,
		setProjectSectionColor,
		toggleProjectSectionCollapsed,
	};
}
