// src/app/blocked-page/page.tsx
export default function BlockedPage() {
     return (
       <div className="min-h-screen bg-gray-900 flex items-center justify-center">
         <div className="text-center p-8 bg-gray-800 rounded-xl shadow-2xl shadow-purple-500/5">
           <h1 className="text-4xl font-bold text-white mb-4">Site Blocked</h1>
           <p className="text-gray-300 mb-6">
             This site has been blocked to help you stay focused.
           </p>
           <div className="text-purple-400 text-lg">
             Time to get back to work! 💪
           </div>
         </div>
       </div>
     );
   }