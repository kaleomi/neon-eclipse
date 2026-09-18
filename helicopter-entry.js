// An import/WebGL failure must leave a readable, non-destructive landing page rather than an endless spinner.
import('./helicopter-app.js').catch(error=>{
  console.error('H-01 startup failed:',error);
  if(document.body.dataset.heliMode!=='error'){
    document.body.dataset.heliMode='error';
    document.querySelector('#heli-overlay-title').textContent='场地暂时无法加载';
    document.querySelector('#heli-overlay-copy').textContent='请通过项目 HTTP 服务打开 helicopter.html，确认 Three.js 依赖可用。直接双击文件不会正常运行。没有读取或修改任何游戏存档。';
  }
  document.querySelectorAll('button').forEach(button=>button.disabled=true);
  document.querySelector('#heli-resume').textContent='请检查运行环境后刷新';
});
