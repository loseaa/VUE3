export const Teleport = {
	__is_Teleport: true,
	process(n1: any, n2: any, container: any, anchor: any, context: any) {
		const { patchChildren, mountChildren, move } = context;
		const TPTarget = document.querySelector(n2.props.to);
		if (!n1) {
			mountChildren(n2.children, TPTarget);
		} else {
			patchChildren(n1, n2, TPTarget);
			if (n1.props.to !== n2.props.to) {
				if (n2.children instanceof Array) {
					n2.children.forEach((child: any) => {
						move(child, TPTarget, anchor);
					});
				} else {
                    move(n2.children,TPTarget,anchor)
				}
			}
		}
	},
};

export function isTeleport(val: any) {
	return val?.__is_Teleport;
}
