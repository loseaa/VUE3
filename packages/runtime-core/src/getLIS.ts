export function getLIS(arr: Array<number>) {
	
	// 贪心加二分查找
	let res = [0];
    let parents:Array<number|undefined>=[undefined]
	for (let i = 1; i < arr.length; i++) {
		let val = arr[i];
		if (val!=undefined && val > -1) {
			let lastOldVal = arr[res[res.length - 1]!];
			if (lastOldVal !== undefined) {
				if (val > lastOldVal) {
                    parents[i]=res[res.length - 1]!
					res.push(i);
                    
				} else {
                    let target
					// 二分查找
					let l = 0;
					let r = res.length-1;
					while (l <= r) {
						let mid = ((l + r) / 2) | 0;
                        let _val=arr[res[mid]!]
						if (_val !== undefined && val >_val) {
							l = mid + 1;
						}else{
                            target=mid;
                            r=mid-1;
                        }
					}
					
                    parents[i]=parents[res[target!] as number]
                    res[target as number]=i
				}
			}
		}
	}
	if(res.length===1)return []
    let r=[res[res.length-1]]
    while(true){
        if(r[0]==undefined||parents[r[0]]==undefined){
            break;
        }else{
            r.unshift(parents[r[0]])
        }
    }
	return r;
}
