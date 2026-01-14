import{c as b}from"./createLucideIcon.BoAnnfdz.js";import{j as e}from"./index.CAUTDNLv.js";import{A as m}from"./alert-circle.D-j7mFAZ.js";/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h=b("ArrowLeft",[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]]);function y({message:r}){return e.jsxs("div",{className:"mb-4 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl flex items-start gap-2 sm:gap-3 animate-in fade-in slide-in-from-top-2 duration-300",children:[e.jsx(m,{className:"w-5 h-5 flex-shrink-0 mt-0.5"}),e.jsx("span",{className:"text-xs sm:text-sm flex-1",children:r})]})}function k({type:r,value:a,onChange:s,label:d,placeholder:t,icon:i,error:o,required:n=!0,rightElement:l,autocomplete:c,inputMode:u}){return e.jsxs("div",{className:"space-y-1.5",children:[e.jsxs("label",{className:"block text-sm font-medium text-gray-700 dark:text-gray-300",children:[d,n&&e.jsx("span",{className:"text-red-500 ml-1",children:"*"})]}),e.jsxs("div",{className:"relative",children:[e.jsx(i,{className:"absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5 pointer-events-none"}),e.jsx("input",{type:r,value:a,onChange:x=>s(x.target.value),className:`
            w-full pl-10 ${l?"pr-10":"pr-4"} py-3 sm:py-2.5 rounded-lg transition-all duration-200
            border
            ${o?"border-red-300 dark:border-red-500/50 bg-red-50/30 dark:bg-red-900/10 focus:ring-2 focus:ring-red-100 focus:border-red-500":"border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600 focus:ring-2 focus:ring-blue-50 focus:border-blue-500 dark:focus:ring-blue-900/20"}
            text-base sm:text-sm text-gray-900 dark:text-gray-100
            placeholder-gray-400 dark:placeholder-gray-500
            disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed
          `,placeholder:t,required:n,autoComplete:c,inputMode:u}),l&&e.jsx("div",{className:"absolute right-3 top-1/2 transform -translate-y-1/2",children:l})]}),o&&e.jsxs("p",{className:"text-xs sm:text-sm text-red-600 dark:text-red-400 flex items-start gap-1",children:[e.jsx("span",{className:"inline-block mt-0.5",children:"⚠"}),e.jsx("span",{children:o})]})]})}function j({label:r,isLoading:a=!1,icon:s,disabled:d=!1}){const t=a||d;return e.jsxs("button",{type:"submit",disabled:t,className:`
        w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold 
        transition-all duration-200
        text-sm sm:text-base
        ${t?"bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500":"bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow dark:bg-blue-600 dark:hover:bg-blue-500 active:transform active:scale-[0.99]"}
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
      `,children:[s&&e.jsx(s,{className:`w-5 h-5 ${a?"animate-spin":""}`}),e.jsx("span",{children:r})]})}export{y as A,k as a,j as b,h as c};
