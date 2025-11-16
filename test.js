let fn = () => {
	console.log(this.x);
};
let obj = { x: 1 };
fn.call(obj);
