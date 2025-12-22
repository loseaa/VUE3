function getCount(n1,n2){
    let arr=[]
    for(let i=0;i<n1.length;i++){
            arr.push(n1[i]-n2[i])
    }
    console.log(arr);
    
    if(arr.reduce((pre,cur)=>pre+cur,0)!==0){
        return -1
    }
    let res=arr.reduce((pre,cur)=>pre+Math.abs(cur),0)/2
    return res
}


console.log(getCount([1,2,3],[3,1,2]));
