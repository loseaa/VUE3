function LIS(arr){
    let dp=new Array(arr.length).fill(1)
    dp=dp.map((e,i)=>[arr[i]])
    for(let i=1;i<arr.length;i++){
        for(let j=0;j<i;j++){
            if(arr[i]>arr[j]){
                if(dp[i].length<dp[j].length+1){
                    dp[i]=dp[j].concat(arr[i])
                }
            }
        }
    }   
    console.log(dp);
    return dp[arr.length-1]
}


console.log(LIS([10,9,2,5,3,7,101,18]));
