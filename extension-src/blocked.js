function updateTimer() {
     chrome.runtime.sendMessage({ action: 'getTimeRemaining' }, (response) => {
       if (response && response.remainingTime > 0) {
         const minutes = Math.floor(response.remainingTime / 60);
         const seconds = Math.floor(response.remainingTime % 60);
         document.getElementById('timer').textContent = 
           `${minutes}:${seconds.toString().padStart(2, '0')}`;
       } else {
         document.getElementById('timer').textContent = 'Session ended';
       }
     });
   }
   
   updateTimer();
   setInterval(updateTimer, 1000);