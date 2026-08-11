"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { onAuthStateChanged } from "firebase/auth";

import {
    addDoc,
    collection,
    onSnapshot,
    query,
    serverTimestamp,
    where,
    Timestamp,
} from "firebase/firestore";

import {
    auth,
    firestore,
} from "@/lib/firebase";


interface Withdrawal {
    id:string;
    amount:number;
    paymentMethod:string;
    accountNumber:string;
    status:string;
    createdAt?:Timestamp;
}


export default function TutorWithdrawalsPage(){

    const router = useRouter();


    const [userId,setUserId]=useState("");

    const [balance,setBalance]=useState(0);

    const [withdrawals,setWithdrawals]=useState<Withdrawal[]>([]);


    const [amount,setAmount]=useState("");

    const [method,setMethod]=useState("bKash");

    const [account,setAccount]=useState("");


    const [loading,setLoading]=useState(true);

    const [error,setError]=useState("");

    const [success,setSuccess]=useState("");



    useEffect(()=>{


        const unsubscribeAuth =
        onAuthStateChanged(auth,(user)=>{


            if(!user){

                router.replace("/login");

                return;
            }


            setUserId(user.uid);



            const withdrawalQuery =
            query(
                collection(
                    firestore,
                    "withdrawalRequests"
                ),
                where(
                    "tutorId",
                    "==",
                    user.uid
                )
            );


            onSnapshot(
                withdrawalQuery,
                (snapshot)=>{


                    const list =
                    snapshot.docs.map(doc=>({

                        id:doc.id,

                        amount:Number(
                            doc.data().amount??0
                        ),

                        paymentMethod:
                        doc.data().paymentMethod??"",

                        accountNumber:
                        doc.data().accountNumber??"",

                        status:
                        doc.data().status??"pending",

                        createdAt:
                        doc.data().createdAt

                    }));


                    setWithdrawals(list);

                    setLoading(false);

                }
            );


        });



        return ()=>unsubscribeAuth();


    },[router]);



    const pendingAmount =
    useMemo(()=>{

        return withdrawals
        .filter(
            item=>
            item.status==="pending"
            ||
            item.status==="paid"
        )
        .reduce(
            (sum,item)=>
            sum+item.amount,
            0
        );

    },[withdrawals]);



    async function submitWithdrawal(
        e:FormEvent
    ){

        e.preventDefault();


        const withdrawAmount =
        Number(amount);



        if(withdrawAmount<=0){

            setError(
                "Enter valid amount"
            );

            return;
        }



        if(!account){

            setError(
                "Enter account number"
            );

            return;
        }



        try{


            await addDoc(
                collection(
                    firestore,
                    "withdrawalRequests"
                ),
                {

                    tutorId:userId,

                    amount:withdrawAmount,

                    currency:"BDT",

                    paymentMethod:method,

                    accountNumber:account,


                    status:"pending",


                    requestedAt:
                    serverTimestamp(),

                    createdAt:
                    serverTimestamp()

                }
            );



            setSuccess(
                "Withdrawal request submitted"
            );


            setAmount("");

            setAccount("");



        }
        catch(error){

            console.error(error);

            setError(
                "Unable to submit request"
            );

        }


    }




return (

<main className="min-h-screen bg-slate-50">


<header className="bg-white border-b">

<div className="max-w-5xl mx-auto px-6 py-4 flex justify-between">

<Link
href="/tutor/dashboard"
className="text-2xl font-bold text-emerald-600"
>
Unitor Tutor
</Link>


<Link
href="/tutor/earnings"
>
← Earnings
</Link>


</div>

</header>



<div className="max-w-5xl mx-auto px-6 py-10">


<h1 className="text-3xl font-bold text-slate-900">
Withdraw Money
</h1>


<p className="mt-2 text-slate-600">
Request your tutoring earnings withdrawal.
</p>



<section className="mt-8 bg-white rounded-2xl p-6 shadow-sm">

<p className="text-sm text-slate-500">
Available Balance
</p>


<h2 className="mt-2 text-4xl font-bold text-emerald-600">
৳ {balance}
</h2>


</section>




<section className="mt-8 bg-white rounded-2xl p-6 shadow-sm">


<h2 className="text-xl font-bold">
Request Withdrawal
</h2>



<form
onSubmit={submitWithdrawal}
className="mt-6 space-y-5"
>


<input
type="number"
placeholder="Amount"
value={amount}
onChange={
e=>setAmount(e.target.value)
}
className="w-full border rounded-lg p-3"
/>



<select
value={method}
onChange={
e=>setMethod(e.target.value)
}
className="w-full border rounded-lg p-3"
>

<option>
bKash
</option>

<option>
Nagad
</option>

</select>



<input
placeholder="Account Number"
value={account}
onChange={
e=>setAccount(e.target.value)
}
className="w-full border rounded-lg p-3"
/>




<button
className="w-full bg-emerald-600 text-white rounded-lg py-3 font-semibold"
>
Submit Withdrawal
</button>


</form>


</section>



<section className="mt-8 bg-white rounded-2xl p-6">

<h2 className="text-xl font-bold">
Withdrawal History
</h2>


{
withdrawals.map(item=>(

<div
key={item.id}
className="border-b py-4"
>

<p>
৳ {item.amount}
</p>

<p className="text-sm text-slate-500">
{item.paymentMethod}
:
{item.accountNumber}
</p>


<span>
{item.status}
</span>


</div>

))
}


</section>



</div>


</main>

);


}