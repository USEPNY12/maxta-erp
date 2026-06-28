function r(e){if(!e)return"-";const t=new Date(e);return isNaN(t.getTime())?e:`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`}export{r as f};
