(function () {
  'use strict';

  const L = window.L;
  const F = window.LanshanFormats;
  const $ = (id) => document.getElementById(id);

  /* --------------------------- 初始状态 --------------------------- */
  const now = new Date();
  const pad = (v) => String(v).padStart(2, '0');
  $('activityDate').value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  $('activityTime').value = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const state = { points: [], closed: false, sport: 'running' };

  /* WGS-84（GPS 标准）与 GCJ-02（高德底图）互转。地图上按 GCJ-02 显示，导出前转回 WGS-84。 */
  const PI = Math.PI;
  const A = 6378245.0;
  const E = 0.00669342162296594323;
  function outOfChina(lat, lng) {
    return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
  }
  function transformLat(x, y) {
    let v = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    v += (20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2 / 3;
    v += (20 * Math.sin(y * PI) + 40 * Math.sin(y / 3 * PI)) * 2 / 3;
    v += (160 * Math.sin(y / 12 * PI) + 320 * Math.sin(y * PI / 30)) * 2 / 3;
    return v;
  }
  function transformLng(x, y) {
    let v = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    v += (20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2 / 3;
    v += (20 * Math.sin(x * PI) + 40 * Math.sin(x / 3 * PI)) * 2 / 3;
    v += (150 * Math.sin(x / 12 * PI) + 300 * Math.sin(x / 30 * PI)) * 2 / 3;
    return v;
  }
  function wgsToGcj(lat, lng) {
    if (outOfChina(lat, lng)) return [lat, lng];
    const dLat0 = transformLat(lng - 105, lat - 35);
    const dLng0 = transformLng(lng - 105, lat - 35);
    const radLat = lat / 180 * PI;
    let magic = Math.sin(radLat);
    magic = 1 - E * magic * magic;
    const sqrtMagic = Math.sqrt(magic);
    const dLat = (dLat0 * 180) / ((A * (1 - E)) / (magic * sqrtMagic) * PI);
    const dLng = (dLng0 * 180) / (A / sqrtMagic * Math.cos(radLat) * PI);
    return [lat + dLat, lng + dLng];
  }
  function gcjToWgs(lat, lng) {
    if (outOfChina(lat, lng)) return [lat, lng];
    let wLat = lat;
    let wLng = lng;
    for (let i = 0; i < 6; i++) {
      const [gLat, gLng] = wgsToGcj(wLat, wLng);
      wLat += lat - gLat;
      wLng += lng - gLng;
    }
    return [wLat, wLng];
  }

  const map = L.map('map', { zoomControl: false }).setView(wgsToGcj(31.2304, 121.4737), 13);

  const tiles = [
    L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
      subdomains: '1234',
      maxZoom: 18,
      attribution: '© 高德地图',
    }),
    L.tileLayer('https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}', {
      subdomains: '1234',
      maxZoom: 18,
      attribution: '© 高德地图',
    }),
  ];
  let layer = 0;
  tiles[layer].addTo(map);

  const lines = L.layerGroup().addTo(map);
  const pins = L.layerGroup().addTo(map);

  const note = (text) => {
    $('notice').textContent = text;
  };

  function duration(totalSeconds) {
    const s = Math.max(0, Math.round(totalSeconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
  }

  function paceText(secondsPerKm) {
    return `${Math.floor(secondsPerKm / 60)}:${pad(Math.round(secondsPerKm % 60))} /km`;
  }

  function readSettings() {
    return {
      pace: Number($('pace').value),
      laps: Number($('laps').value),
      weight: Number($('weight').value),
      heartRate: Number($('heartRate').value),
      cadence: Number($('cadence').value),
      altitude: Number($('altitude').value),
    };
  }

  function activityStart() {
    const date = $('activityDate').value;
    const time = $('activityTime').value;
    if (!date || !time) throw new Error('请选择活动日期和开始时间');
    const start = new Date(`${date}T${time}:00`);
    if (Number.isNaN(start.getTime())) throw new Error('活动日期或开始时间无效');
    return start;
  }

  /* --------------------------- 面板与地图 --------------------------- */
  function draw() {
    lines.clearLayers();
    pins.clearLayers();

    const path = state.closed && state.points.length > 2 ? [...state.points, state.points[0]] : state.points;
    if (path.length > 1) {
      L.polyline(path, { color: '#174d37', weight: 5, lineCap: 'round', lineJoin: 'round' }).addTo(lines);
    }
    state.points.forEach((p, i) => {
      L.circleMarker(p, {
        radius: i === 0 || i === state.points.length - 1 ? 7 : 5,
        color: 'white',
        weight: 3,
        fillColor: i === 0 ? '#c36c42' : '#174d37',
        fillOpacity: 1,
      })
        .bindTooltip(i === 0 ? '起点' : `点 ${i + 1}`)
        .addTo(pins);
    });

    const settings = readSettings();
    const stats = F.measure({
      points: state.points,
      closed: state.closed,
      laps: settings.laps,
      pace: settings.pace,
      sport: state.sport,
      weight: settings.weight,
    });

    // 多圈时路线必须闭合，地图上把“回起点”的那一段用虚线画出来，保证所见即所得
    if (stats.autoClosed && state.points.length > 2) {
      L.polyline([state.points[state.points.length - 1], state.points[0]], {
        color: '#c36c42',
        weight: 3,
        dashArray: '6 6',
        lineCap: 'round',
      }).addTo(lines);
    }

    $('pointCount').textContent = `${state.points.length} 个点`;
    $('distance').innerHTML = `${(stats.total / 1000).toFixed(2)} <i>km</i>`;
    $('duration').textContent = duration(stats.elapsed);
    $('paceValue').textContent = paceText(settings.pace);
    $('paceLabel').innerHTML = `${Math.floor(settings.pace / 60)}:${pad(Math.round(settings.pace % 60))} <i>/km</i>`;
    $('lapsValue').textContent =
      settings.laps > 1 ? `${settings.laps} 圈 · ${((stats.length || 0) / 1000).toFixed(2)} km/圈` : '1 圈';

    if (!state.points.length) {
      note('点击地图添加路线点');
    } else if (state.points.length < 2) {
      note('再添加一个点即可生成轨迹');
    } else if (stats.error) {
      note(stats.error);
    } else {
      const auto = stats.autoClosed && settings.laps > 1 ? ' · 多圈已自动闭合回起点' : '';
      note(`${state.points.length} 个路线点 · ${(stats.total / 1000).toFixed(2)} km${auto}`);
    }

    $('undoBtn').disabled = !state.points.length;
    $('reverseBtn').disabled = state.points.length < 2;
    $('closeBtn').disabled = state.points.length < 3;
    $('clearBtn').disabled = !state.points.length;
  }

  map.on('click', (e) => {
    state.points.push([e.latlng.lat, e.latlng.lng]);
    state.closed = false;
    draw();
  });

  $('undoBtn').onclick = () => {
    state.points.pop();
    state.closed = false;
    draw();
  };
  $('reverseBtn').onclick = () => {
    state.points.reverse();
    state.closed = false;
    draw();
  };
  $('closeBtn').onclick = () => {
    state.closed = !state.closed;
    draw();
  };
  $('clearBtn').onclick = () => {
    state.points = [];
    state.closed = false;
    draw();
  };
  $('pace').oninput = draw;
  $('laps').oninput = draw;
  ['weight', 'heartRate', 'cadence', 'altitude'].forEach((id) => {
    const el = $(id);
    if (el) el.oninput = draw;
  });

  document.querySelectorAll('.sport').forEach((button) => {
    button.onclick = () => {
      document.querySelectorAll('.sport').forEach((x) => x.classList.remove('active'));
      button.classList.add('active');
      state.sport = button.dataset.sport;
      draw();
    };
  });

  /* ----------------------------- 地点搜索 ----------------------------- */
  async function search() {
    const q = $('searchInput').value.trim();
    if (!q) return;
    note('正在搜索地点…');
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 9000);
      try {
        const response = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error('搜索服务暂不可用，请稍后重试');
        const list = await response.json();
        if (!list.features || !list.features.length) throw new Error('没有找到这个地点');
        const item = list.features[0];
        const [lng, lat] = item.geometry.coordinates;
        map.setView(wgsToGcj(lat, lng), 15);
        const label = [item.properties.name, item.properties.city || item.properties.state]
          .filter(Boolean)
          .join(' · ');
        $('mapLabel').textContent = label || q;
        note('地点已定位，点击地图绘制');
      } finally {
        clearTimeout(timer);
      }
    } catch (e) {
      note(e.name === 'AbortError' ? '搜索超时，请在地图上直接点选' : e.message || '搜索失败，请稍后重试');
    }
  }
  $('searchBtn').onclick = search;
  $('searchInput').onkeydown = (e) => {
    if (e.key === 'Enter') search();
  };

  $('locateBtn').onclick = () => map.locate({ setView: false, maxZoom: 15 });
  map.on('locationfound', (e) => {
    const [lat, lng] = wgsToGcj(e.latlng.lat, e.latlng.lng);
    map.setView([lat, lng], 15);
    note('已定位到当前位置');
  });
  map.on('locationerror', () => note('无法获取位置，请检查浏览器定位权限'));
  $('fitBtn').onclick = () => state.points.length && map.fitBounds(L.latLngBounds(state.points).pad(0.18));
  $('layerBtn').onclick = () => {
    map.removeLayer(tiles[layer]);
    layer = 1 - layer;
    tiles[layer].addTo(map);
    const satellite = layer === 1;
    $('mapSource').textContent = satellite ? 'AMAP SAT' : 'AMAP';
    note(satellite ? '已切换到卫星图' : '已切换到高德路网');
  };

  /* ----------------------------- 文件导出 ----------------------------- */
  function save(name, data, type) {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  let fitSdkPromise;
  function getFitSdk() {
    if (!fitSdkPromise) {
      fitSdkPromise = (async () => {
        try {
          return await import(new URL('./assets/fitsdk.js', location.href).href);
        } catch (localError) {
          try {
            return await import('https://cdn.jsdelivr.net/npm/@garmin/fitsdk@21.222.0/+esm');
          } catch (firstError) {
            try {
              return await import('https://esm.sh/@garmin/fitsdk@21.222.0?bundle');
            } catch (secondError) {
              throw new Error(
                'Garmin FIT 编码器加载失败，请检查网络后重试（' +
                  (secondError.message || firstError.message || localError.message || '加载失败') +
                  '）'
              );
            }
          }
        }
      })();
    }
    return fitSdkPromise;
  }

  function buildCurrentActivity() {
    const settings = readSettings();
    const start = activityStart();
    const activity = F.buildActivity({
      points: state.points.map(([lat, lng]) => gcjToWgs(lat, lng)),
      closed: state.closed,
      laps: settings.laps,
      pace: settings.pace,
      sport: state.sport,
      start,
      weight: settings.weight,
      heartRate: settings.heartRate,
      cadence: settings.cadence,
      altitude: settings.altitude,
    });
    const check = F.validateActivity(activity);
    if (!check.ok) throw new Error('运动数据自检未通过：' + check.issues[0]);
    return activity;
  }

  function futureWarning(activity) {
    if (activity.start.getTime() > Date.now() + 5 * 60 * 1000) {
      return ' · 注意：开始时间在未来，部分平台会拒绝导入';
    }
    return '';
  }

  function activityFileName(activity, ext) {
    const d = activity.start;
    const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const time = `${pad(d.getHours())}${pad(d.getMinutes())}`;
    return `lanshan-run-${date}-${time}.${ext}`;
  }

  async function exportFormat(format, button) {
    try {
      if (button) button.disabled = true;
      note(`正在生成 ${format.toUpperCase()}…`);
      const activity = buildCurrentActivity();
      const km = (activity.totalDistance / 1000).toFixed(2);
      let summary = `已导出 ${format.toUpperCase()} · ${activity.samples.length} 个采样点 · ${km} km · ${duration(
        activity.totalElapsed
      )} · 约 ${activity.calories} kcal`;

      if (format === 'gpx') {
        save(activityFileName(activity, 'gpx'), F.toGpx(activity), 'application/gpx+xml');
      } else if (format === 'tcx') {
        save(activityFileName(activity, 'tcx'), F.toTcx(activity), 'application/vnd.garmin.tcx+xml');
      } else {
        const sdk = await getFitSdk();
        const { bytes } = F.toFitActivity(activity, sdk);
        save(activityFileName(activity, 'fit'), bytes, 'application/octet-stream');
        summary = `已导出 FIT（CRC 校验通过）· ${activity.samples.length} 个采样点 · ${km} km · ${duration(
          activity.totalElapsed
        )} · 约 ${activity.calories} kcal`;
      }
      note(summary + futureWarning(activity));
    } catch (e) {
      note(e.message || '导出失败');
    } finally {
      if (button) button.disabled = false;
    }
  }

  document.querySelectorAll('.export-card').forEach((button) => {
    button.onclick = () => exportFormat(button.dataset.format, button);
  });

  $('helpBtn').onclick = () => $('helpDialog').showModal();
  $('closeHelp').onclick = () => $('helpDialog').close();
  $('gotIt').onclick = () => $('helpDialog').close();

  draw();
})();
