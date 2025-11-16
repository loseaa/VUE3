const queue: any = [];
let flushing = false;
let p = Promise.resolve();

export function queueJob(job: Function) {
	if (queue.indexOf(job) < 0) queue.push(job);
	if (!flushing) {
		flushing = true;
		p.then(() => {
			flushing = false;
			let copy = queue.slice(0);
			queue.length = 0;
			copy.forEach((job: Function) => {
				job();
			});
		});
	}
}
