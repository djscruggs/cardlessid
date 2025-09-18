import React from 'react';
const Phone: React.FC<{ children?: React.ReactNode }> = ({ children }) => {

  return (
    <div className="relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-800 border-[14px] rounded-[2.5rem] h-[600px] w-[300px]">
      <div className="h-[32px] w-[3px] bg-gray-800 dark:bg-gray-800 absolute -left-[17px] top-[78px] rounded-l-lg"></div>
      <div className="h-[46px] w-[3px] bg-gray-800 dark:bg-gray-800 absolute -left-[17px] top-[124px] rounded-l-lg"></div>
      <div className="h-[46px] w-[3px] bg-gray-800 dark:bg-gray-800 absolute -left-[17px] top-[171px] rounded-l-lg"></div>
      <div className="h-[46px] w-[3px] bg-gray-800 dark:bg-gray-800 absolute -right-[17px] top-[124px] rounded-r-lg"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-7 bg-gray-800 rounded-b-xl"></div>
      <div className="rounded-[2rem] overflow-hidden w-[272px] h-[572px] bg-white dark:bg-gray-800 flex flex-col">
        <div className="w-full h-10 px-4 flex justify-between items-center text-black dark:text-white z-10 pt-4">
          <div className="text-xs font-semibold">9:41</div>
          <div className="flex items-center">
            <div className="w-1 h-1 mr-[2px] bg-black dark:bg-white rounded-full"></div>
            <div className="w-1 h-2 mr-[2px] bg-black dark:bg-white rounded-full"></div>
            <div className="w-1 h-3 mr-[2px] bg-black dark:bg-white rounded-full"></div>
            <div className="w-1 h-4 mr-[2px] bg-gray-400 dark:bg-gray-600 rounded-full"></div>
            <span className='text-[8px] mr-[2px]'>90%</span>
           
            <div className="w-5 h-2.5 border border-black dark:border-white rounded-sm flex items-center p-px">
              <div className="w-3/4 h-full bg-black dark:bg-white rounded-sm"></div>
            </div>
          </div>
        </div>
        <div className="flex-grow overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );

    

}
export default Phone;