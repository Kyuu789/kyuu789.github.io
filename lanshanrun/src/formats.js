/*!
 * Lanshan Run — 运动文件生成核心
 * 纯计算模块：不依赖 DOM，可在浏览器直接加载，也可在 Node 中做校验。
 * 统一生成 GPX / TCX / FIT，保证采样点连续、时间与距离一致。
 */
(function (global) {
  'use strict';

  const EARTH_RADIUS = 6371008.8;
  const SOURCE = 'Lanshan Run';
  const MANUFACTURER = 'development';
  const PRODUCT = 1;
  const SERIAL = 3728192;

  const SPORTS = {
    running: { fit: 'running', tcx: 'Running', gpx: 'running', met: 9.8, label: '跑步' },
    cycling: { fit: 'cycling', tcx: 'Biking', gpx: 'cycling', met: 7.5, label: '骑行' },
    walking: { fit: 'walking', tcx: 'Other', gpx: 'walking', met: 4.3, label: '步行' },
  };

  function sportMeta(sport) {
    return SPORTS[sport] || SPORTS.running;
  }

  function toRad(v) {
    return (v * Math.PI) / 180;
  }

  /** 两点球面距离（米） */
  function haversine(a, b) {
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * EARTH_RADIUS * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function normalizePoints(points) {
    if (!Array.isArray(points)) return [];
    return points
      .map((p) =>
        Array.isArray(p) ? { lat: Number(p[0]), lon: Number(p[1]) } : { lat: Number(p.lat), lon: Number(p.lon) }
      )
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180)
      .filter((p, i, arr) => i === 0 || p.lat !== arr[i - 1].lat || p.lon !== arr[i - 1].lon);
  }

  function dedupeClose(points) {
    const out = [points[0]];
    for (let i = 1; i < points.length; i++) {
      if (haversine(out[out.length - 1], points[i]) > 0.5) out.push(points[i]);
    }
    return out;
  }

  /**
   * 构造一条可用于重复跑的环形路线。
   * 多圈时起点与终点必须重合，否则圈与圈之间会出现 GPS 瞬移。
   */
  function buildRoute(points, closed, laps) {
    let route = normalizePoints(points);
    if (route.length < 2) throw new Error('请先在地图上添加至少两个路线点');
    route = dedupeClose(route);
    if (route.length < 2) throw new Error('路线点距离过近，请重新绘制');

    const alreadyClosed =
      route.length > 2 && haversine(route[0], route[route.length - 1]) < 1.5;
    let autoClosed = false;

    if ((closed || laps > 1) && !alreadyClosed) {
      route.push({ ...route[0] });
      autoClosed = !closed; // 用户没有点“闭合”，但多圈必须闭合
    }
    if (route.length < 3) throw new Error('路线长度不足，请多添加几个路线点');

    const cumulative = [0];
    for (let i = 1; i < route.length; i++) {
      cumulative.push(cumulative[i - 1] + haversine(route[i - 1], route[i]));
    }
    const length = cumulative[cumulative.length - 1];
    if (length < 20) throw new Error('路线太短（不足 20 米），请重新绘制');

    return { route, cumulative, length, autoClosed, alreadyClosed };
  }

  /** 在路线内按距离取点（d 可超过单圈长度，会自动进入下一圈） */
  function pointAtDistance(routeData, distance, totalDistance) {
    const { route, cumulative, length } = routeData;
    if (distance <= 0) return { ...route[0] };
    if (distance >= totalDistance) return { ...route[route.length - 1] };

    let local = distance % length;
    if (local === 0) local = length;

    let lo = 0;
    let hi = cumulative.length - 1;
    while (lo + 1 < hi) {
      const mid = (lo + hi) >> 1;
      if (cumulative[mid] <= local) lo = mid;
      else hi = mid;
    }
    const segLength = cumulative[hi] - cumulative[lo] || 1;
    const ratio = (local - cumulative[lo]) / segLength;
    const from = route[lo];
    const to = route[hi];
    return {
      lat: from.lat + (to.lat - from.lat) * ratio,
      lon: from.lon + (to.lon - from.lon) * ratio,
    };
  }

  function clampNumber(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.round(n)));
  }

  function estimateCalories(sport, seconds, weightKg) {
    const meta = sportMeta(sport);
    const weight = Number(weightKg) > 0 ? Number(weightKg) : 65;
    return Math.max(0, Math.round((meta.met * 3.5 * weight * seconds) / (200 * 60)));
  }

  /**
   * 生成一条完整的“运动记录”。
   * 采样固定为每秒一次（超长路线自动降采样），速度恒定，距离与时间严格单调。
   */
  function buildActivity(options) {
    const {
      points,
      closed = false,
      laps = 1,
      pace,
      sport = 'running',
      start,
      weight = 65,
      heartRate = 145,
      cadence = 170,
      altitude = 7,
      maxSamples = 20000,
    } = options || {};

    const lapCount = Math.max(1, Math.min(10, Math.round(Number(laps) || 1)));
    const paceSeconds = Number(pace);
    if (!Number.isFinite(paceSeconds) || paceSeconds <= 0) throw new Error('配速设置无效');
    if (!(start instanceof Date) || Number.isNaN(start.getTime())) throw new Error('请选择有效的活动日期和开始时间');

    const routeData = buildRoute(points, closed, lapCount);
    const length = routeData.length;
    const totalDistance = length * lapCount;
    const speed = 1000 / paceSeconds; // 米/秒
    const totalElapsed = Math.round(totalDistance / speed);
    const hr = clampNumber(heartRate, 60, 240, 145);
    const cad = clampNumber(cadence, 30, 260, 170);
    const ele = clampNumber(altitude, -500, 9000, 7);

    // 超长路线降采样，避免生成几十万个点导致设备拒绝
    const step = totalElapsed > maxSamples ? Math.ceil(totalElapsed / maxSamples) : 1;
    const samples = [];
    for (let t = 0; t < totalElapsed; t += step) {
      const d = Math.min(totalDistance, t * speed);
      const p = pointAtDistance(routeData, d, totalDistance);
      samples.push({ t, time: new Date(start.getTime() + t * 1000), lat: p.lat, lon: p.lon, distance: d });
    }
    {
      const p = pointAtDistance(routeData, totalDistance, totalDistance);
      samples.push({
        t: totalElapsed,
        time: new Date(start.getTime() + totalElapsed * 1000),
        lat: p.lat,
        lon: p.lon,
        distance: totalDistance,
      });
    }

    const lp = [];
    for (let i = 0; i < lapCount; i++) {
      const startSecond = Math.round((i * length) / speed);
      const endSecond = Math.round(((i + 1) * length) / speed);
      const lapElapsed = endSecond - startSecond;
      const startPoint = pointAtDistance(routeData, i * length, totalDistance);
      const endPoint = pointAtDistance(routeData, (i + 1) * length, totalDistance);
      lp.push({
        index: i,
        startSecond,
        endSecond,
        elapsed: lapElapsed,
        distance: length,
        calories: estimateCalories(sport, lapElapsed, weight),
        startPoint,
        endPoint,
      });
    }

    return {
      sport,
      pace: paceSeconds,
      start,
      end: new Date(start.getTime() + totalElapsed * 1000),
      samples,
      laps: lp,
      lapCount,
      lapLength: length,
      totalDistance,
      totalElapsed,
      speed,
      calories: estimateCalories(sport, totalElapsed, weight),
      autoClosed: routeData.autoClosed,
      sampleSeconds: step,
      weight: Number(weight) > 0 ? Number(weight) : 65,
      heartRate: hr,
      cadence: cad,
      altitude: ele,
    };
  }

  /** 只做统计，不生成采样点（用于面板实时显示） */
  function measure(options) {
    const { points, closed = false, laps = 1, pace, sport = 'running', weight = 65 } = options || {};
    const lapCount = Math.max(1, Math.min(10, Math.round(Number(laps) || 1)));
    let routeData;
    try {
      routeData = buildRoute(points, closed, lapCount);
    } catch (e) {
      return { length: 0, total: 0, elapsed: 0, laps: lapCount, autoClosed: false, error: e.message };
    }
    const total = routeData.length * lapCount;
    const elapsed = (total / 1000) * (Number(pace) || 0);
    return {
      length: routeData.length,
      total,
      elapsed,
      laps: lapCount,
      autoClosed: routeData.autoClosed,
      calories: estimateCalories(sport, elapsed, weight),
      error: null,
    };
  }

  /** 导出前的数据自检：位置连续性、距离/时间单调性、速度异常 */
  function validateActivity(activity) {
    const issues = [];
    const s = activity.samples;
    if (!s || s.length < 2) {
      return { ok: false, issues: ['轨迹采样点不足，无法生成有效运动数据'] };
    }
    const speed = activity.speed;
    const maxStep = activity.sampleSeconds || 1;
    for (let i = 0; i < s.length; i++) {
      const p = s[i];
      if (Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180) issues.push(`第 ${i + 1} 个采样点坐标越界`);
      if (!Number.isFinite(p.distance) || p.distance < 0) issues.push(`第 ${i + 1} 个采样点距离无效`);
      if (i === 0) continue;
      const prev = s[i - 1];
      const dt = p.t - prev.t;
      if (dt <= 0) issues.push(`第 ${i + 1} 个采样点时间未递增`);
      if (p.distance + 0.01 < prev.distance) issues.push(`第 ${i + 1} 个采样点距离倒退`);
      const gap = haversine(prev, p);
      const expected = speed * Math.max(dt, 0);
      // 位置跳变不超过“应有位移 + 容差”，杜绝瞬移
      if (gap > Math.max(5, expected * 1.5 + 2)) {
        issues.push(`第 ${i + 1} 个采样点位置跳变 ${gap.toFixed(1)} 米（预期约 ${expected.toFixed(1)} 米）`);
      }
      if (p.distance - prev.distance > expected * 1.5 + 5) {
        issues.push(`第 ${i + 1} 个采样点距离增长异常`);
      }
      if (dt > maxStep * 2) issues.push(`第 ${i + 1} 个采样点时间间隔过大（${dt}s）`);
      if (issues.length > 8) break;
    }
    const last = s[s.length - 1];
    if (Math.abs(last.distance - activity.totalDistance) > 1) issues.push('末尾距离与总距离不一致');
    if (Math.abs(last.t - activity.totalElapsed) > 1) issues.push('末尾时间与总时长不一致');

    return { ok: issues.length === 0, issues };
  }

  /* ------------------------------ GPX ------------------------------ */

  function xmlEscape(value) {
    return String(value).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c])
    );
  }

  function toGpx(activity, name) {
    const meta = sportMeta(activity.sport);
    const title = name || 'Lanshan Run';
    const points = activity.samples
      .map(
        (p) =>
          `<trkpt lat="${p.lat.toFixed(7)}" lon="${p.lon.toFixed(7)}"><ele>${activity.altitude}</ele><time>${p.time.toISOString()}</time>` +
          `<extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>${activity.heartRate}</gpxtpx:hr><gpxtpx:cad>${activity.cadence}</gpxtpx:cad></gpxtpx:TrackPointExtension></extensions>` +
          '</trkpt>'
      )
      .join('');
    return (
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<gpx xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' +
      ' xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"' +
      ' xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd"' +
      ` version="1.1" creator="${SOURCE}">` +
      `<metadata><name>${xmlEscape(title)}</name><time>${activity.start.toISOString()}</time></metadata>` +
      `<trk><name>${xmlEscape(title)}</name><type>${meta.gpx}</type><trkseg>${points}</trkseg></trk>` +
      '</gpx>'
    );
  }

  /* ------------------------------ TCX ------------------------------ */

  function tcxTrackpoints(samples, withTime, activity) {
    const hr = activity ? `<HeartRateBpm><Value>${activity.heartRate}</Value></HeartRateBpm>` : '';
    const cad = activity ? `<Cadence>${activity.cadence}</Cadence>` : '';
    const alt = activity ? activity.altitude : 0;
    return samples
      .map((p) => {
        const time = withTime ? `<Time>${p.time.toISOString()}</Time>` : '';
        return (
          '<Trackpoint>' +
          time +
          `<Position><LatitudeDegrees>${p.lat.toFixed(7)}</LatitudeDegrees><LongitudeDegrees>${p.lon.toFixed(7)}</LongitudeDegrees></Position>` +
          `<AltitudeMeters>${alt}</AltitudeMeters><DistanceMeters>${p.distance.toFixed(2)}</DistanceMeters>` +
          hr +
          cad +
          '</Trackpoint>'
        );
      })
      .join('');
  }
  function toTcx(activity, name) {
    const meta = sportMeta(activity.sport);
    const id = activity.start.toISOString();
    const laps = activity.laps
      .map((lap) => {
        const points = activity.samples.filter((p) => p.t >= lap.startSecond && p.t <= lap.endSecond);
        const track = tcxTrackpoints(points, true, activity);
        return (
          `<Lap StartTime="${new Date(activity.start.getTime() + lap.startSecond * 1000).toISOString()}">` +
          `<TotalTimeSeconds>${lap.elapsed.toFixed(1)}</TotalTimeSeconds>` +
          `<DistanceMeters>${lap.distance.toFixed(2)}</DistanceMeters>` +
          `<MaximumSpeed>${activity.speed.toFixed(3)}</MaximumSpeed>` +
          `<Calories>${lap.calories}</Calories>` +
          `<AverageHeartRateBpm><Value>${activity.heartRate}</Value></AverageHeartRateBpm>` +
          '<Intensity>Active</Intensity>' +
          `<Cadence>${activity.cadence}</Cadence>` +
          '<TriggerMethod>Manual</TriggerMethod>' +
          `<Track>${track}</Track></Lap>`
        );
      })
      .join('');
    return (
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"' +
      ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' +
      ' xsi:schemaLocation="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2 http://www.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd">' +
      `<Activities><Activity Sport="${meta.tcx}"><Id>${id}</Id>${laps}` +
      '</Activity></Activities></TrainingCenterDatabase>'
    );
  }

  /* --------------------------- 课程（路线） --------------------------- */

  /** 把折线加密成约每 10 米一个点，并带累计距离，用于课程文件 */
  function buildGeometry(points, closed) {
    const route = normalizePoints(points);
    if (route.length < 2) throw new Error('请先在地图上添加至少两个路线点');
    const raw = route.map((p) => ({ ...p }));
    if (closed && raw.length > 2 && haversine(raw[0], raw[raw.length - 1]) > 1.5) raw.push({ ...raw[0] });

    const out = [{ ...raw[0], distance: 0 }];
    let total = 0;
    for (let i = 1; i < raw.length; i++) {
      const from = raw[i - 1];
      const to = raw[i];
      const seg = haversine(from, to);
      const steps = Math.max(1, Math.ceil(seg / 10));
      for (let s = 1; s <= steps; s++) {
        const ratio = s / steps;
        total += seg / steps;
        out.push({
          lat: from.lat + (to.lat - from.lat) * ratio,
          lon: from.lon + (to.lon - from.lon) * ratio,
          distance: total,
        });
      }
    }
    if (total < 20) throw new Error('路线太短（不足 20 米），请重新绘制');
    return { points: out, length: total };
  }

  function toGpxRoute(geometry, name) {
    const title = name || 'Lanshan Run Course';
    const pts = geometry.points
      .map(
        (p) =>
          `<rtept lat="${p.lat.toFixed(7)}" lon="${p.lon.toFixed(7)}"><ele>0</ele><name>${p.distance.toFixed(0)} m</name></rtept>`
      )
      .join('');
    return (
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<gpx xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' +
      ' xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd"' +
      ` version="1.1" creator="${SOURCE}">` +
      `<metadata><name>${xmlEscape(title)}</name><desc>规划路线，不是运动记录。</desc></metadata>` +
      `<rte><name>${xmlEscape(title)}</name><desc>Lanshan Run 规划路线</desc>${pts}</rte></gpx>`
    );
  }

  function toTcxCourse(geometry, name, options) {
    const opts = options || {};
    const pace = Number(opts.pace) || 360;
    const elapsed = (geometry.length / 1000) * pace;
    const start = opts.start instanceof Date ? opts.start : new Date();
    const first = geometry.points[0];
    const last = geometry.points[geometry.points.length - 1];
    const track = geometry.points
      .map((p) => {
        const time = new Date(start.getTime() + (p.distance / 1000) * pace * 1000).toISOString();
        return (
          '<Trackpoint>' +
          `<Time>${time}</Time>` +
          `<Position><LatitudeDegrees>${p.lat.toFixed(7)}</LatitudeDegrees><LongitudeDegrees>${p.lon.toFixed(7)}</LongitudeDegrees></Position>` +
          `<AltitudeMeters>0</AltitudeMeters><DistanceMeters>${p.distance.toFixed(2)}</DistanceMeters>` +
          '</Trackpoint>'
        );
      })
      .join('');
    return (
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"' +
      ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' +
      ' xsi:schemaLocation="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2 http://www.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd">' +
      `<Courses><Course><Name>${xmlEscape(name)}</Name>` +
      `<Lap><TotalTimeSeconds>${elapsed.toFixed(1)}</TotalTimeSeconds>` +
      `<DistanceMeters>${geometry.length.toFixed(2)}</DistanceMeters>` +
      `<BeginPosition><LatitudeDegrees>${first.lat.toFixed(7)}</LatitudeDegrees><LongitudeDegrees>${first.lon.toFixed(7)}</LongitudeDegrees></BeginPosition>` +
      `<EndPosition><LatitudeDegrees>${last.lat.toFixed(7)}</LatitudeDegrees><LongitudeDegrees>${last.lon.toFixed(7)}</LongitudeDegrees></EndPosition>` +
      '<Intensity>Active</Intensity></Lap>' +
      `<Track>${track}</Track></Course></Courses></TrainingCenterDatabase>`
    );
  }

  /* ------------------------------ FIT ------------------------------ */

  function encodeFit(messages, sdk) {
    const { Encoder, Decoder, Stream } = sdk;
    const encoder = new Encoder();
    messages.forEach((message) => encoder.writeMesg(message));
    const bytes = encoder.close();
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const decoder = new Decoder(Stream.fromArrayBuffer(buffer));
    if (!decoder.isFIT()) throw new Error('FIT 文件头无效');
    if (!decoder.checkIntegrity()) throw new Error('FIT 文件 CRC 校验失败');
    const result = decoder.read();
    if (result.errors && result.errors.length) {
      const text = result.errors.map((e) => (typeof e === 'string' ? e : e.message || JSON.stringify(e))).join('；');
      throw new Error('FIT 解码错误：' + text);
    }
    return { bytes, messages: result.messages || {} };
  }

  function toFitActivity(activity, sdk, options) {
    const opts = options || {};
    const { Profile, Utils } = sdk;
    const meta = sportMeta(activity.sport);
    const t0 = Utils.convertDateToDateTime(activity.start);
    const serial = opts.serialNumber || SERIAL;
    const localOffset = -activity.start.getTimezoneOffset() * 60;
    const endTime = t0 + activity.totalElapsed;
    const halfLat = (lat) => Math.round((lat * 2147483648) / 180);
    const halfLon = (lon) => Math.round((lon * 2147483648) / 180);

    const messages = [
      {
        mesgNum: Profile.MesgNum.FILE_ID,
        type: 'activity',
        manufacturer: MANUFACTURER,
        product: PRODUCT,
        serialNumber: serial,
        timeCreated: t0,
      },
      {
        mesgNum: Profile.MesgNum.DEVICE_INFO,
        timestamp: t0,
        deviceIndex: 'creator',
        manufacturer: MANUFACTURER,
        product: PRODUCT,
        productName: 'Lanshan Run',
        serialNumber: serial,
        softwareVersion: 1.0,
      },
      { mesgNum: Profile.MesgNum.EVENT, timestamp: t0, event: 'timer', eventType: 'start', eventGroup: 0 },
    ];

    activity.samples.forEach((p) => {
      messages.push({
        mesgNum: Profile.MesgNum.RECORD,
        timestamp: t0 + p.t,
        positionLat: halfLat(p.lat),
        positionLong: halfLon(p.lon),
        altitude: activity.altitude,
        enhancedAltitude: activity.altitude,
        distance: p.distance,
        speed: activity.speed,
        enhancedSpeed: activity.speed,
        heartRate: activity.heartRate,
        cadence: activity.cadence,
      });
    });

    activity.laps.forEach((lap) => {
      messages.push({
        mesgNum: Profile.MesgNum.LAP,
        messageIndex: lap.index,
        timestamp: t0 + lap.endSecond,
        startTime: t0 + lap.startSecond,
        startPositionLat: halfLat(lap.startPoint.lat),
        startPositionLong: halfLon(lap.startPoint.lon),
        endPositionLat: halfLat(lap.endPoint.lat),
        endPositionLong: halfLon(lap.endPoint.lon),
        event: 'lap',
        eventType: 'stop',
        totalElapsedTime: lap.elapsed,
        totalTimerTime: lap.elapsed,
        totalDistance: lap.distance,
        totalCalories: lap.calories,
        avgHeartRate: activity.heartRate,
        avgCadence: activity.cadence,
        avgSpeed: activity.speed,
        maxSpeed: activity.speed,
        enhancedAvgSpeed: activity.speed,
        enhancedMaxSpeed: activity.speed,
        intensity: 'active',
        lapTrigger: 'manual',
        sport: meta.fit,
        subSport: 'generic',
      });
    });

    messages.push(
      { mesgNum: Profile.MesgNum.EVENT, timestamp: endTime, event: 'timer', eventType: 'stopAll', eventGroup: 0 },
      {
        mesgNum: Profile.MesgNum.SESSION,
        messageIndex: 0,
        timestamp: endTime,
        startTime: t0,
        event: 'session',
        eventType: 'stop',
        sport: meta.fit,
        subSport: 'generic',
        totalElapsedTime: activity.totalElapsed,
        totalTimerTime: activity.totalElapsed,
        totalDistance: activity.totalDistance,
        totalCalories: activity.calories,
        avgHeartRate: activity.heartRate,
        avgCadence: activity.cadence,
        avgSpeed: activity.speed,
        maxSpeed: activity.speed,
        enhancedAvgSpeed: activity.speed,
        enhancedMaxSpeed: activity.speed,
        firstLapIndex: 0,
        numLaps: activity.laps.length,
        trigger: 'activityEnd',
      },
      {
        mesgNum: Profile.MesgNum.ACTIVITY,
        timestamp: endTime,
        totalTimerTime: activity.totalElapsed,
        numSessions: 1,
        type: 'manual',
        event: 'activity',
        eventType: 'stop',
        localTimestamp: endTime + localOffset,
      }
    );

    const encoded = encodeFit(messages, sdk);
    const keys = Object.keys(encoded.messages);
    const find = (prefix) => keys.find((k) => k.toLowerCase().startsWith(prefix));
    if (!find('record') || !find('session') || !find('lap') || !find('activity')) {
      throw new Error('FIT 文件缺少轨迹、圈段、会话或活动消息');
    }
    return encoded;
  }

  function toFitCourse(geometry, sdk, options) {
    const opts = options || {};
    const { Profile, Utils } = sdk;
    const meta = sportMeta(opts.sport);
    const created = Utils.convertDateToDateTime(opts.start instanceof Date ? opts.start : new Date());
    const pace = Number(opts.pace) || 360;
    const serial = opts.serialNumber || SERIAL;
    const elapsed = Math.round((geometry.length / 1000) * pace);
    const first = geometry.points[0];
    const last = geometry.points[geometry.points.length - 1];
    const halfLat = (lat) => Math.round((lat * 2147483648) / 180);
    const halfLon = (lon) => Math.round((lon * 2147483648) / 180);

    const messages = [
      {
        mesgNum: Profile.MesgNum.FILE_ID,
        type: 'course',
        manufacturer: MANUFACTURER,
        product: PRODUCT,
        serialNumber: serial,
        timeCreated: created,
      },
      { mesgNum: Profile.MesgNum.COURSE, name: opts.name || 'Lanshan Run', sport: meta.fit, subSport: 'generic' },
      {
        mesgNum: Profile.MesgNum.LAP,
        messageIndex: 0,
        timestamp: created + elapsed,
        startTime: created,
        startPositionLat: halfLat(first.lat),
        startPositionLong: halfLon(first.lon),
        endPositionLat: halfLat(last.lat),
        endPositionLong: halfLon(last.lon),
        totalElapsedTime: elapsed,
        totalTimerTime: elapsed,
        totalDistance: geometry.length,
        sport: meta.fit,
        subSport: 'generic',
        intensity: 'active',
      },
    ];

    geometry.points.forEach((p) => {
      messages.push({
        mesgNum: Profile.MesgNum.RECORD,
        timestamp: created + Math.round((p.distance / 1000) * pace),
        positionLat: halfLat(p.lat),
        positionLong: halfLon(p.lon),
        altitude: 0,
        enhancedAltitude: 0,
        distance: p.distance,
      });
    });

    const encoded = encodeFit(messages, sdk);
    const keys = Object.keys(encoded.messages);
    const find = (prefix) => keys.find((k) => k.toLowerCase().startsWith(prefix));
    if (!find('course') || !find('lap') || !find('record')) {
      throw new Error('FIT Course 文件缺少课程、圈段或轨迹消息');
    }
    return encoded;
  }

  global.LanshanFormats = {
    SPORTS,
    haversine,
    buildActivity,
    measure,
    validateActivity,
    buildGeometry,
    estimateCalories,
    toGpx,
    toTcx,
    toTcxCourse,
    toGpxRoute,
    toFitActivity,
    toFitCourse,
    xmlEscape,
  };
})(typeof window !== 'undefined' ? window : globalThis);
