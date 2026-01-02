import{a as x,j as a}from"./index.Bee4g0Y8.js";const y={invalid_credentials:"Invalid email or password. Please try again.",email_taken:"This email is already registered. Please try logging in instead.",weak_password:"Password must be at least 6 characters long.",invalid_email:"Please enter a valid email address.",invalid_phone:"Please enter a valid phone number.",invalid_student_id:"Please enter a valid student ID.","Invalid login credentials":"Invalid email or password. Please try again.","Email already registered":"This email is already registered. Please try logging in instead.","Password should be at least 6 characters":"Password must be at least 6 characters long.","Invalid email format":"Please enter a valid email address.",default:"An error occurred. Please try again."};function v(e){if(!e)return"";const r=e.message||e.error_description||e.code;return y[r]||y.default}function w(e){return/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)}function j(e){return e.length>=6}/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var h={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase().trim(),d=(e,r)=>{const s=x.forwardRef(({color:n="currentColor",size:t=24,strokeWidth:o=2,absoluteStrokeWidth:i,className:c="",children:l,...u},g)=>x.createElement("svg",{ref:g,...h,width:t,height:t,stroke:n,strokeWidth:i?Number(o)*24/Number(t):o,className:["lucide",`lucide-${f(e)}`,c].join(" "),...u},[...r.map(([m,b])=>x.createElement(m,b)),...Array.isArray(l)?l:[l]]));return s.displayName=`${e}`,s};/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=d("AlertCircle",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]]);/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A=d("ArrowLeft",[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]]);/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N=d("EyeOff",[["path",{d:"M9.88 9.88a3 3 0 1 0 4.24 4.24",key:"1jxqfv"}],["path",{d:"M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68",key:"9wicm4"}],["path",{d:"M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61",key:"1jreej"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22",key:"a6p6uj"}]]);/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const E=d("Eye",[["path",{d:"M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z",key:"rwhkz3"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const P=d("Loader2",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L=d("Lock",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]]);function _({message:e}){return a.jsxs("div",{className:"mb-4 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl flex items-start gap-2 sm:gap-3 animate-in fade-in slide-in-from-top-2 duration-300",children:[a.jsx(p,{className:"w-5 h-5 flex-shrink-0 mt-0.5"}),a.jsx("span",{className:"text-xs sm:text-sm flex-1",children:e})]})}function C({type:e,value:r,onChange:s,label:n,placeholder:t,icon:o,error:i,required:c=!0,rightElement:l,autocomplete:u,inputMode:g}){return a.jsxs("div",{className:"space-y-1.5",children:[a.jsxs("label",{className:"block text-sm font-medium text-gray-700 dark:text-gray-300",children:[n,c&&a.jsx("span",{className:"text-red-500 ml-1",children:"*"})]}),a.jsxs("div",{className:"relative",children:[a.jsx(o,{className:"absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5 pointer-events-none"}),a.jsx("input",{type:e,value:r,onChange:m=>s(m.target.value),className:`
            w-full pl-10 ${l?"pr-10":"pr-4"} py-3 sm:py-2.5 rounded-lg transition-all duration-200
            border
            ${i?"border-red-300 dark:border-red-500/50 bg-red-50/30 dark:bg-red-900/10 focus:ring-2 focus:ring-red-100 focus:border-red-500":"border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600 focus:ring-2 focus:ring-blue-50 focus:border-blue-500 dark:focus:ring-blue-900/20"}
            text-base sm:text-sm text-gray-900 dark:text-gray-100
            placeholder-gray-400 dark:placeholder-gray-500
            disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed
          `,placeholder:t,required:c,autoComplete:u,inputMode:g}),l&&a.jsx("div",{className:"absolute right-3 top-1/2 transform -translate-y-1/2",children:l})]}),i&&a.jsxs("p",{className:"text-xs sm:text-sm text-red-600 dark:text-red-400 flex items-start gap-1",children:[a.jsx("span",{className:"inline-block mt-0.5",children:"⚠"}),a.jsx("span",{children:i})]})]})}function M({label:e,isLoading:r=!1,icon:s,disabled:n=!1}){const t=r||n;return a.jsxs("button",{type:"submit",disabled:t,className:`
        w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold 
        transition-all duration-200
        text-sm sm:text-base
        ${t?"bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500":"bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow dark:bg-blue-600 dark:hover:bg-blue-500 active:transform active:scale-[0.99]"}
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
      `,children:[s&&a.jsx(s,{className:`w-5 h-5 ${r?"animate-spin":""}`}),a.jsx("span",{children:e})]})}export{p as A,E,P as L,_ as a,C as b,d as c,L as d,j as e,N as f,v as g,M as h,A as i,w as v};
