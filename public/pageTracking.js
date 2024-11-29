let startTime = Date.now();

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    const endTime = Date.now();
    const timeSpent = endTime - startTime;
    console.log(`Time spent on page: ${timeSpent} ms`);
    // Store or send the timeSpent data
  } else {
    startTime = Date.now();
  }
});
