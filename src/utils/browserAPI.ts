// src/utils/browserAPI.ts
export interface StorageData {
     [key: string]: any;
   }
   
   export const browserAPI = {
     storage: {
       sync: {
         get: async (key: string | null): Promise<StorageData> => {
           try {
             if (typeof chrome !== 'undefined' && chrome.storage) {
               return await new Promise((resolve) => 
                 chrome.storage.sync.get(key, (data) => resolve(data))
               );
             }
             // Development fallback
             const stored = localStorage.getItem('extension-storage');
             return stored ? JSON.parse(stored) : {};
           } catch (error) {
             console.error('Storage get error:', error);
             return {};
           }
         },
         set: async (items: StorageData): Promise<void> => {
           try {
             if (typeof chrome !== 'undefined' && chrome.storage) {
               return await new Promise((resolve) => 
                 chrome.storage.sync.set(items, () => resolve())
               );
             }
             // Development fallback
             localStorage.setItem('extension-storage', JSON.stringify(items));
           } catch (error) {
             console.error('Storage set error:', error);
           }
         }
       }
     },
     runtime: {
       sendMessage: async (message: any): Promise<any> => {
         try {
           if (typeof chrome !== 'undefined' && chrome.runtime) {
             return await new Promise((resolve) => 
               chrome.runtime.sendMessage(message, (response) => resolve(response))
             );
           }
           // Development fallback
           console.log('Development mode - Message:', message);
           return null;
         } catch (error) {
           console.error('Runtime message error:', error);
           return null;
         }
       }
     }
   };