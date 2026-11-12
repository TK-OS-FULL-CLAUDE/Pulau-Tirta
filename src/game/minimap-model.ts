/** Coordinates stay in world pixels; clamp the viewport, never the player marker. */
export function minimapView(x:number,y:number,worldWidth:number,worldHeight:number){
 const width=Math.min(768,worldWidth),height=Math.min(576,worldHeight);
 const left=Math.max(0,Math.min(worldWidth-width,x-width/2));
 const top=Math.max(0,Math.min(worldHeight-height,y-height/2));
 return {left,top,width,height,playerX:(x-left)/width,playerY:(y-top)/height};
}
export function worldMapView(x:number,y:number,zoom:number,worldWidth:number,worldHeight:number){
 const safeZoom=Math.max(1,Math.min(6,zoom));
 const width=worldWidth/safeZoom,height=worldHeight/safeZoom;
 return {left:Math.max(0,Math.min(worldWidth-width,x-width/2)),top:Math.max(0,Math.min(worldHeight-height,y-height/2)),width,height};
}
