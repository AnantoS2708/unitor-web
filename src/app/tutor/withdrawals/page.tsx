"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { onAuthStateChanged } from "firebase/auth";

import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import {
  auth,
  firestore,
} from "@/lib/firebase";



/*
=================================================
PAYMENT MODEL
=================================================
*/

interface Payment {

  id: string;

  paymentId: string;

  transactionId: string;

  amount: number;

  platformFee: number;

  tutorEarning: number;

  status: string;

  tutorBalanceCredited: boolean;

  studentName: string;

  courseCode: string;

  createdAt?: Timestamp;

}



/*
=================================================
WITHDRAWAL MODEL
=================================================
*/

interface WithdrawalRequest {

  id: string;

  requestId: string;

  amount: number;

  bkashNumber: string;

  status: string;

  tutorId: string;

  tutorName: string;

  tutorEmail: string;

  tutorTransactionId: string;

  paidBy: string;

  createdAt?: Timestamp;

  updatedAt?: Timestamp;

  paidAt?: Timestamp;

}



export default function TutorWithdrawalsPage(){

  const router = useRouter();



  const [
    userId,
    setUserId
  ] = useState("");



  const [
    tutorName,
    setTutorName
  ] = useState("Tutor");



  const [
    tutorEmail,
    setTutorEmail
  ] = useState("");



  const [
    payments,
    setPayments
  ] = useState<Payment[]>([]);



  const [
    withdrawals,
    setWithdrawals
  ] = useState<WithdrawalRequest[]>([]);



  const [
    amount,
    setAmount
  ] = useState("");



  const [
    bkashNumber,
    setBkashNumber
  ] = useState("");



  const [
    loadingPayments,
    setLoadingPayments
  ] = useState(true);



  const [
    loadingWithdrawals,
    setLoadingWithdrawals
  ] = useState(true);



  const [
    submitting,
    setSubmitting
  ] = useState(false);



  const [
    error,
    setError
  ] = useState("");



  const [
    success,
    setSuccess
  ] = useState("");



/*
=================================================
LOAD USER + PAYMENT + WITHDRAW DATA
=================================================
*/


useEffect(()=>{


let unsubscribeUser:
undefined | (()=>void);



let unsubscribePayments:
undefined | (()=>void);



let unsubscribeWithdrawals:
undefined | (()=>void);




const unsubscribeAuth =
onAuthStateChanged(
auth,
(user)=>{


if(!user){

router.replace("/login");

return;

}



setUserId(user.uid);



setTutorEmail(
user.email?.toLowerCase() ?? ""
);




/*
USER PROFILE
*/


unsubscribeUser =
onSnapshot(

doc(
firestore,
"users",
user.uid
),

(snapshot)=>{


if(snapshot.exists()){


const data =
snapshot.data();



setTutorName(
data.fullName ??
"Tutor"
);



setTutorEmail(

(
data.universityEmail ??
user.email ??
""

).toLowerCase()

);



}


}

);





/*
PAYMENTS
*/


const paymentQuery =
query(

collection(
firestore,
"payments"
),

where(
"tutorId",
"==",
user.uid
)

);



unsubscribePayments =
onSnapshot(

paymentQuery,

(snapshot)=>{


const paymentList =
snapshot.docs.map(

(paymentDoc)=>{


const data =
paymentDoc.data();



const amount =
Number(
data.amount ?? 0
);



return {


id:
paymentDoc.id,


paymentId:
data.paymentId ??
paymentDoc.id,


transactionId:
data.transactionId ??
"",


amount,


platformFee:
Number(
data.platformFee ??
amount * 0.10
),


tutorEarning:
Number(
data.tutorEarning ??
amount * 0.90
),


status:
data.status ??
"pending",


studentName:
data.studentName ??
"Student",


courseCode:
data.courseCode ??
"Course",


createdAt:
data.createdAt,


} as Payment;


}

);



setPayments(paymentList);


setLoadingPayments(false);



},

(error)=>{


console.error(
"Payment loading error",
error
);


setError(
"Unable to load payment history."
);


setLoadingPayments(false);


}

);

/*
=================================================
WITHDRAWAL LOAD
=================================================
*/


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



unsubscribeWithdrawals =
onSnapshot(

withdrawalQuery,

(snapshot)=>{


const withdrawalList =
snapshot.docs.map(

(withdrawalDoc)=>{


const data =
withdrawalDoc.data();



return {


id:
withdrawalDoc.id,


requestId:
data.requestId ??
withdrawalDoc.id,


amount:
Number(
data.amount ?? 0
),


bkashNumber:
data.bkashNumber ??
"",


status:
data.status ??
"pending",


tutorId:
data.tutorId ??
"",


tutorName:
data.tutorName ??
"Tutor",


tutorEmail:
data.tutorEmail ??
"",


tutorTransactionId:
data.tutorTransactionId ??
"",


paidBy:
data.paidBy ??
"",


createdAt:
data.createdAt,


updatedAt:
data.updatedAt,


paidAt:
data.paidAt,


} as WithdrawalRequest;


}

);



withdrawalList.sort(

(a,b)=>

(b.createdAt?.toMillis?.() ?? 0)
-
(a.createdAt?.toMillis?.() ?? 0)

);



setWithdrawals(
withdrawalList
);



setLoadingWithdrawals(false);


},

(error)=>{


console.error(
"Withdrawal loading error",
error
);



setError(
"Unable to load withdrawal history."
);



setLoadingWithdrawals(false);


}

);



}

);



return ()=>{


unsubscribeAuth();


unsubscribeUser?.();


unsubscribePayments?.();


unsubscribeWithdrawals?.();


};


},[router]);





/*
=================================================
WALLET CALCULATIONS
=================================================
*/


const totalStudentPayment =
useMemo(()=>{


return payments.reduce(

(total,payment)=>

total + payment.amount,

0

);


},[payments]);





const totalEarnings =
useMemo(()=>{


return payments

.filter(

(payment)=>

payment.status.toLowerCase()
===
"successful"

)

.reduce(

(total,payment)=>

total + payment.tutorEarning,

0

);


},[payments]);





const totalPlatformFee =
useMemo(()=>{


return payments.reduce(

(total,payment)=>

total + payment.platformFee,

0

);


},[payments]);





const pendingWithdrawal =
useMemo(()=>{


return withdrawals

.filter(

(item)=>

item.status.toLowerCase()
===
"pending"

)

.reduce(

(total,item)=>

total + item.amount,

0

);


},[withdrawals]);





const withdrawnAmount =
useMemo(()=>{


return withdrawals

.filter(

(item)=>

item.status.toLowerCase()
===
"paid"

)

.reduce(

(total,item)=>

total + item.amount,

0

);


},[withdrawals]);





const availableBalance =
Math.max(

0,

totalEarnings
-
pendingWithdrawal
-
withdrawnAmount

);





const hasPendingWithdrawal =
withdrawals.some(

(item)=>

item.status.toLowerCase()
===
"pending"

);



/*
=================================================
CREATE WITHDRAWAL REQUEST
=================================================
*/


async function handleWithdrawal(
event:FormEvent<HTMLFormElement>
){

event.preventDefault();



setError("");

setSuccess("");



const withdrawalAmount =
Number(amount);



const cleanNumber =
bkashNumber.trim();





if(
hasPendingWithdrawal
){

setError(
"You already have a pending withdrawal request."
);

return;

}




if(
withdrawalAmount <= 0
){

setError(
"Enter a valid amount."
);

return;

}





if(
withdrawalAmount >
availableBalance
){

setError(

`Available balance is ${formatMoney(
availableBalance
)}`

);

return;

}





if(
!/^01\d{9}$/.test(cleanNumber)
){

setError(
"Enter a valid bKash number."
);

return;

}




try{


setSubmitting(true);



const withdrawalRef =
await addDoc(

collection(
firestore,
"withdrawalRequests"
),

{


amount:
withdrawalAmount,


bkashNumber:
cleanNumber,


status:
"pending",


requestId:
"",


tutorId:
userId,


tutorName,


tutorEmail,


tutorTransactionId:
"",


paidBy:
"",


createdAt:
serverTimestamp(),


updatedAt:
serverTimestamp(),


paidAt:null,


}

);



await updateDoc(

withdrawalRef,

{

requestId:
withdrawalRef.id

}

);



setAmount("");

setBkashNumber("");



setSuccess(
"Withdrawal request submitted successfully."
);



}

catch(error){


console.error(
error
);


setError(
"Unable to submit withdrawal request."
);



}

finally{


setSubmitting(false);


}


}




const loading =
loadingPayments ||
loadingWithdrawals;

return (
<main className="min-h-screen bg-slate-50">

<header className="border-b border-slate-200 bg-white">

<div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

<Link
href="/tutor/dashboard"
className="text-2xl font-bold text-emerald-600"
>
Unitor Wallet
</Link>


<Link
href="/tutor/dashboard"
className="font-medium text-slate-600 hover:text-emerald-600"
>
← Dashboard
</Link>


</div>

</header>



<div className="mx-auto max-w-7xl px-6 py-10">


<p className="font-semibold text-emerald-600">
Tutor financial account
</p>


<h1 className="mt-2 text-3xl font-bold text-slate-900">
Tutor Wallet
</h1>


<p className="mt-3 text-slate-600">
View payments, earnings and withdraw your money.
</p>




{error && (

<div className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
{error}
</div>

)}



{success && (

<div className="mt-6 rounded-xl bg-emerald-50 p-4 text-emerald-700">
{success}
</div>

)}



{loading ? (

<div className="mt-10 rounded-2xl bg-white p-10 text-center">
Loading wallet...
</div>


)

:

(

<>


<section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">


<BalanceCard
title="Available balance"
value={formatMoney(availableBalance)}
color="emerald"
/>



<BalanceCard
title="Total earned"
value={formatMoney(totalEarnings)}
color="blue"
/>



<BalanceCard
title="Student payments"
value={formatMoney(totalStudentPayment)}
color="purple"
/>



<BalanceCard
title="Unitor fee (10%)"
value={formatMoney(totalPlatformFee)}
color="amber"
/>


</section>





<div className="mt-10 grid gap-8 lg:grid-cols-5">


<section className="rounded-2xl bg-white p-8 shadow-sm lg:col-span-2">


<h2 className="text-2xl font-bold text-slate-900">
Withdraw money
</h2>


<p className="mt-2 text-sm text-slate-600">
Request your available earnings.
</p>



<form
onSubmit={handleWithdrawal}
className="mt-6 space-y-5"
>


<div>

<label className="mb-2 block font-medium">
Amount (BDT)
</label>


<input
type="number"
value={amount}
onChange={(e)=>setAmount(e.target.value)}
placeholder="Enter amount"
disabled={hasPendingWithdrawal}
className="w-full rounded-lg border px-4 py-3"
/>

</div>




<div>

<label className="mb-2 block font-medium">
bKash Number
</label>


<input
type="tel"
maxLength={11}
value={bkashNumber}
onChange={(e)=>
setBkashNumber(
e.target.value.replace(/\D/g,"")
)
}
placeholder="01XXXXXXXXX"
disabled={hasPendingWithdrawal}
className="w-full rounded-lg border px-4 py-3"
/>

</div>



<button
disabled={
submitting ||
availableBalance<=0 ||
hasPendingWithdrawal
}
className="w-full rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
>

{
submitting
?
"Submitting..."
:
"Request Withdrawal"
}

</button>


</form>


</section>





<section className="rounded-2xl bg-white shadow-sm lg:col-span-3">


<div className="border-b p-6">

<h2 className="text-xl font-bold">
Withdrawal History
</h2>

</div>



{
withdrawals.length===0

?

<div className="p-10 text-center">
No withdrawal request yet.
</div>

:

<div className="divide-y">

{
withdrawals.map(
(item)=>(

<WithdrawalRow
key={item.id}
withdrawal={item}
/>

)

)

}

</div>

}



</section>



</div>







<section className="mt-10 rounded-2xl bg-white shadow-sm">


<div className="border-b p-6">

<h2 className="text-xl font-bold">
Payment History
</h2>

</div>



<div className="divide-y">

{
payments.map(

(payment)=>(

<PaymentRow
key={payment.id}
payment={payment}
/>

)

)

}

</div>



</section>



</>

)

}



</div>


</main>

);

}




/*
=================================================
BALANCE CARD
=================================================
*/


function BalanceCard({
title,
value,
color
}:{
title:string;
value:string;
color:
"emerald"|
"blue"|
"purple"|
"amber";
}){


const style={

emerald:
"bg-emerald-50 text-emerald-700",

blue:
"bg-blue-50 text-blue-700",

purple:
"bg-purple-50 text-purple-700",

amber:
"bg-amber-50 text-amber-700",

};



return (

<div className="rounded-2xl bg-white p-6 shadow-sm">

<span className={`rounded-lg px-3 py-1 text-sm font-semibold ${style[color]}`}>

{title}

</span>


<p className="mt-5 text-3xl font-bold">

{value}

</p>


</div>

);

}






/*
=================================================
PAYMENT ROW
=================================================
*/


function PaymentRow({
payment
}:{
payment:Payment;
}){


return (

<div className="flex justify-between p-5">


<div>

<h3 className="font-bold">
Student payment
</h3>


<p className="text-sm text-slate-500">
Status: {payment.status}
</p>


{
payment.tutorBalanceCredited &&

<p className="text-xs text-emerald-600">
Added to wallet
</p>

}


</div>



<div className="text-right">


<p className="text-xl font-bold text-emerald-600">
+{formatMoney(payment.tutorEarning)}
</p>


<p className="text-xs text-slate-400">
After 10% fee
</p>


</div>



</div>

);

}






/*
=================================================
WITHDRAW ROW
=================================================
*/


function WithdrawalRow({
withdrawal
}:{
withdrawal:WithdrawalRequest;
}){


const status =
withdrawal.status.toLowerCase();



return (

<div className="flex justify-between p-5">


<div>


<div className="flex gap-3">


<h3 className="font-bold">
{formatMoney(withdrawal.amount)}
</h3>


<span className="rounded-full bg-amber-100 px-3 py-1 text-xs">

{status}

</span>


</div>



<p className="mt-2 text-sm text-slate-500">

bKash:
{withdrawal.bkashNumber}

</p>



{
withdrawal.tutorTransactionId &&

<p className="text-sm text-emerald-600">

Transaction:
{withdrawal.tutorTransactionId}

</p>

}


</div>



</div>

);

}





function formatMoney(amount:number){

return new Intl.NumberFormat(
"en-BD",
{
style:"currency",
currency:"BDT"
}

).format(amount);

}





function formatDate(timestamp?:Timestamp){

if(!timestamp)
return "Processing";


return timestamp
.toDate()
.toLocaleString();

}

