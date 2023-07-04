import alwaysPos from "./page.js";

const callAlwaysPos = (number) => {
    const result = alwaysPos(number);
  
    if (result <= 0) {
      throw new Error('Logic error: The alwaysPos function returned a non-positive number.');
    }
    
    return result;
}
  
callAlwaysPos(0);