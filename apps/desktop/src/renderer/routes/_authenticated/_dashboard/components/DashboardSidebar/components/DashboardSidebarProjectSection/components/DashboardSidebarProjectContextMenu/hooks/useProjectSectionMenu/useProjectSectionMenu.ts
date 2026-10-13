import { eq, useLiveQuery } from "@tanstack/react-db";
import { useMemo } from "react";
import { useDashboardSidebarSectionRename } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/components/DashboardSidebarSectionRenameContext";
import { useCollections } from "renderer/routes/_authenticated/providers/CollectionsProvider";
import { useProjectSidebarSections } from "../../../../../../hooks/useProjectSidebarSections";

/** The Projects-list sections a project can move to, and the moves. */
export function useProjectSectionMenu(projectId: string) {
	const collections = useCollections();
	const { createProjectSection, moveProjectToSection } =
		useProjectSidebarSections();
	const { requestSectionRename } = useDashboardSidebarSectionRename();
	const { data: sectionRows = [] } = useLiveQuery(
		(q) =>
			q
				.from({ sections: collections.v2SidebarProjectSections })
				.select(({ sections }) => ({
					id: sections.sectionId,
					name: sections.name,
					color: sections.color,
					tabOrder: sections.tabOrder,
				})),
		[collections],
	);
	const { data: placementRows = [] } = useLiveQuery(
		(q) =>
			q
				.from({ projects: collections.v2SidebarProjects })
				.where(({ projects }) => eq(projects.projectId, projectId))
				.select(({ projects }) => ({ sectionId: projects.sectionId })),
		[collections, projectId],
	);
	const sections = useMemo(
		() =>
			[...sectionRows].sort(
				(left, right) =>
					left.tabOrder - right.tabOrder || left.id.localeCompare(right.id),
			),
		[sectionRows],
	);
	const placedSectionId = placementRows[0]?.sectionId ?? null;
	const currentSectionId = sections.some(
		(section) => section.id === placedSectionId,
	)
		? placedSectionId
		: null;

	return {
		sections,
		currentSectionId,
		moveToSection: (sectionId: string | null) =>
			moveProjectToSection(projectId, sectionId),
		moveToNewSection: () => {
			const sectionId = createProjectSection({ fromProjectId: projectId });
			requestSectionRename(sectionId);
		},
	};
}
