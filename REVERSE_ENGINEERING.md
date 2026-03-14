# Reverse Engineering Notes — Marklife APK

> Source: Decompiled APK `com.feioou.deliprint.yxq` v3.6.0 (JADX output)
> Located at: `com.feioou.deliprint.yxq.apk/sources/`

---

## Table of Contents

- [1. APK Structure](#1-apk-structure)
- [2. BLE Connection](#2-ble-connection)
  - [2.1 UUIDs](#21-uuids)
  - [2.2 Discovery and Filtering](#22-discovery-and-filtering)
  - [2.3 Connection State Machine](#23-connection-state-machine)
  - [2.4 MTU Negotiation](#24-mtu-negotiation)
  - [2.5 Credit-Based Flow Control](#25-credit-based-flow-control)
  - [2.6 Data Transmission](#26-data-transmission)
  - [2.7 Printer Status Messages](#27-printer-status-messages)
  - [2.8 Print Completion](#28-print-completion)
- [3. Printer Protocols](#3-printer-protocols)
  - [3.1 Protocol Overview](#31-protocol-overview)
  - [3.2 L11 Binary Protocol (P15, P12, P11, P7)](#32-l11-binary-protocol-p15-p12-p11-p7)
  - [3.3 CommandPort Compressed Protocol (P50, P80, S2)](#33-commandport-compressed-protocol-p50-p80-s2)
  - [3.4 S8 SPP Protocol](#34-s8-spp-protocol)
  - [3.5 TSPL Text Protocol](#35-tspl-text-protocol)
- [4. Image Encoding](#4-image-encoding)
  - [4.1 Grayscale and Thresholding](#41-grayscale-and-thresholding)
  - [4.2 Floyd-Steinberg Dithering](#42-floyd-steinberg-dithering)
  - [4.3 Bit-Packing](#43-bit-packing)
  - [4.4 Compression](#44-compression)
- [5. Device → Protocol Mapping](#5-device--protocol-mapping)
- [6. Obfuscated Constants Reference](#6-obfuscated-constants-reference)
- [7. Key Source Files](#7-key-source-files)

---

## 1. APK Structure

```
com.feioou.deliprint.yxq.apk/
├── resources/
│   ├── AndroidManifest.xml
│   ├── res/
│   └── assets/
└── sources/
    ├── com/
    │   ├── feioou/deliprint/yxq/    # App logic (device management, UI, utils)
    │   ├── yxqapp/sdk/              # Core SDK (BLE, protocols, commands)
    │   ├── btapplication/sdk/       # Native encoding (DFunction)
    │   ├── bluetrum/fota/           # Firmware OTA
    │   └── caysn/autoreplyprint/    # External print library (D100/X4)
    ├── com/yxqapp/ynative/          # Native zlib compression (YxqZLib)
    └── [obfuscated packages]        # 240+ single-letter packages (ProGuard)
```

The app is heavily obfuscated with ProGuard. Constants from libraries like Guava (`com.google.common.base.a`) and iTextPDF (`com.itextpdf.text.pdf.r`) are used in protocol code — see [Section 6](#6-obfuscated-constants-reference) for a full mapping.

---

## 2. BLE Connection

### 2.1 UUIDs

**Primary Service (P15, P12, P11, P50, S2, and most BLE printers):**

| Role | UUID |
|------|------|
| Service | `0000ff00-0000-1000-8000-00805f9b34fb` |
| RX (Notify — printer→host) | `0000ff01-0000-1000-8000-00805f9b34fb` |
| TX (Write — host→printer) | `0000ff02-0000-1000-8000-00805f9b34fb` |
| CX (Control — flow control, MTU) | `0000ff03-0000-1000-8000-00805f9b34fb` |
| CCCD Descriptor | `00002902-0000-1000-8000-00805f9b34fb` |

**Alternative Service (P80 and fallback):**

| Role | UUID |
|------|------|
| Service | `49535343-fe7d-4ae5-8fa9-9fafd205e455` |
| RX (Notify) | `49535343-1e4d-4bd9-ba61-23c647249616` |
| TX (Write) | `49535343-8841-43f4-a8d4-ecbe34729bb3` |

The app first tries the primary service. If not found, falls back to the alternative.

### 2.2 Discovery and Filtering

- BLE scan for nearby devices
- Filter by device name prefix (e.g. `name.startsWith("P15")`)
- RSSI filter: must be > -90 dBm and < 0 dBm for auto-connect
- No pairing/bonding required
- Auto-reconnect: scans for last connected device by name match

**Known P15 variants:** P15, P15R, P15S, P7 (mapped to P15 series), iSPACE_LP15, OUT_LPC, M1.

### 2.3 Connection State Machine

```
scan() → connectGatt(device, autoConnect=false, callback, TRANSPORT_LE)
    │
    ├─ onConnectionStateChange(state=2, CONNECTED)
    │   └─ discoverServices()
    │       └─ onServicesDiscovered()
    │           ├─ Find service 0000ff00 (or fallback 49535343)
    │           ├─ Get TX, RX, CX characteristics
    │           ├─ Enable notifications on RX via CCCD
    │           ├─ Enable notifications on CX via CCCD
    │           ├─ Set TX write type = WRITE_NO_RESPONSE (1)
    │           └─ connectedCallback() → isOpen = true
    │
    ├─ onConnectionStateChange(state=0, DISCONNECTED)
    │   ├─ error 133 or 22 → retry (up to 4 attempts, 200ms delay)
    │   └─ other error → connectFailedCallback()
    │
    └─ 10-second timeout → connectFailedCallback()
```

**Retry logic:** On error codes 133 or 22, the app retries `connectGatt()` up to 4 times with a 200ms delay between attempts (tracked via `mindex` counter).

### 2.4 MTU Negotiation

After connection, the printer advertises its MTU via the CX characteristic:

```
CX notification: [0x02, mtu_lo, mtu_hi]
```

- MTU value = `(byte[2] << 8) | byte[1]` (little-endian)
- Effective packet size = `MTU - 3`
- Default MTU: **240** → effective payload: **237 bytes**

**Device-specific packet size overrides** (hardcoded in `write()`):

| Device prefix | Packet size (bytes) |
|--------------|-------------------|
| P12, LP90 | 90 |
| P11 | 90 |
| P15S, P15_, P50_, P1S, P50S_, P15R_, LuckP_D1, LP15_, S2, ewtto ET-, OUT_LPC | 95 |
| HarmonyOS devices | 90 |
| All others | 237 |

### 2.5 Credit-Based Flow Control

The printer uses a credit system to throttle data from the host. Credits are communicated via the CX characteristic:

```
CX notification: [0x01, credit_count]
```

- **Initial credits:** Printer sends `[0x01, 0x04]` → app sets `credit = 4`
- **Each packet sent:** `credit--`
- **Printer grants more credits** as it processes data: `credit += received_count`
- **Starvation recovery:** If no credits received for **1 second**, force `credit = 1` and retry

**Timer-based transmission:** Data is sent on a periodic timer. The interval varies by device:

| Device | Timer interval |
|--------|---------------|
| S2 (non-pro) | 30ms |
| S2 (pro) | 10ms |
| P15R, S12_BY_P15R, P7R | 30ms |
| X2, M60 | 1ms |
| Default | 30ms |

**Sanity check:** If `sentPackets - receivedCredits > 4`, a warning is logged.

### 2.6 Data Transmission

All print data is sent via the TX characteristic using **Write Without Response**:

```
1. Chunk data into packets of size min(remaining, packetSize)
2. For each chunk:
   a. Wait for credit > 0
   b. characteristic.setValue(chunk)
   c. gatt.writeCharacteristic(characteristic)
   d. credit--
   e. index += chunk.length
3. If credit == 0 for > 1 second, force credit = 1
```

The `doPrint()` method sets `doType = 1` to signal a print job is active. This triggers result monitoring in the receive handler.

### 2.7 Printer Status Messages

The printer sends status via the RX characteristic as a 2-byte message:

```
RX notification: [0xFF, status_code]
```

| Status code | Meaning |
|------------|---------|
| `0x01` | Out of paper |
| `0x02` | Cover open |
| `0x03` | Overheating |
| `0x04` | Low battery |
| `0x05` | Cover closed |

### 2.8 Print Completion

After sending all print data, the app polls `getSendResult(timeout_ms)` which spins checking a `returndata` field. The printer confirms success by sending one of these first-byte values on RX:

| Response byte | Meaning |
|--------------|---------|
| `0xAA` | Success (confirmation 1) |
| `0x4F` (`'O'`) | Success (confirmation 2) |
| `0x4B` (`'K'`) | Success (confirmation 3) |

Any other first byte or a timeout = failure.

---

## 3. Printer Protocols

### 3.1 Protocol Overview

The app has multiple protocol implementations selected based on device model:

| Protocol ID | Class | Connection | Used by |
|------------|-------|------------|---------|
| 11 | R15Protocol | BLE CommandPort | P11, P12, P15, P7, LP90, M1, S15, S12, LP15, P1s, LPC74 |
| 3 | P50VIOSProtocol | BLE CommandPort | P50, D50, ewtto ET |
| 3 (variant) | P50VIOSProtocol | BLE CommandPort | P80, T3 |
| 1 | S8Protocol | Bluetooth SPP | S8, D210, IP_D80, 210, DP_D80, DP_8028, HM-24-28, A31, U210, A50 |
| 2 | S2VIOSProtocol | BLE CommandPort | S2 (deprecated) |
| 7 | X4Protocol | CAPrinterConnector | D100, X4, L100, D200 |
| 8 | X2BLEProtocol | BLE | X2 |
| 10 | X8Protocol | SPP | X8 series |

### 3.2 L11 Binary Protocol (P15, P12, P11, P7)

This is the protocol used by the **Marklife P15**. Commands are raw byte arrays sent over BLE.

#### Command Reference

| Command | Bytes (hex) | Description |
|---------|------------|-------------|
| Wakeup | `00 00 00 00 00 00 00 00 00 00 00 00 00 00 00` | 15 zero bytes |
| Enable printer | `10 FF F1 02` | Activate print engine |
| Stop print job | `10 FF F1 45` | End print session |
| Print bitmap (raw) | `1D 76 30 QQ WL WH HL HH` + data | See below |
| Set density (P15) | `1F 70 02 DD` | DD = density value |
| Set thickness | `10 FF 10 00 TT` | TT = thickness |
| Feed n dots | `1B 4A NN` | NN = dot count |
| Feed n lines | `1B 64 NN` | NN = line count |
| Position to gap | `1D 0C` | Advance to next label gap |
| Backoff paper | `10 FF F2` | Reverse feed |
| Learn label gap | `10 FF 03` | Calibrate gap sensor |
| Get battery | `10 FF 50 F1` | Query battery level |
| Get printer model | `10 FF 20 F0` | Query model string |
| Get firmware ver | `10 FF 20 F1` | Query firmware version |
| Get serial number | `10 FF 20 F2` | Query serial number |
| Get MAC address | `10 FF 20 F3` | Query Bluetooth MAC |
| Get BT version | `10 FF 30 10` | Query BT module version |
| Get BT name | `10 FF 30 11` | Query BT device name |
| Printer status | `10 FF 40` | Query current status |
| Set shutdown time | `10 FF 12 HH LL` | Auto-off timer (big-endian, seconds) |
| Get shutdown time | `10 FF 13` | Query auto-off timer |
| Open screen | `10 FF 60 01` | Turn on LCD (if present) |
| Close screen | `10 FF 60 00` | Turn off LCD |
| Self check | `1F 40` | Print self-test page |
| Get speed | `1F 60 00` | Query print speed |
| Set speed | `1F 60 SS VV` | SS = speed param, VV = value |
| Get density | `1F 70 00` | Query current density |
| Set density | `1F 70 DD VV` | DD = density param, VV = value |
| Get paper type | `1F 80 00` | Query paper type |
| Set paper type | `1F 80 PP VV` | PP = paper param, VV = value |
| Printer status query | `1F 20 00` | Detailed status query |
| Learn paper | `1F 30 60` | Paper calibration |
| Get sensor value | `1F 30 SS` | SS = sensor ID |
| Reset factory | `1F 50 BE` | Factory reset |

#### Print Bitmap Header (Raw, L11 path)

```
Byte 0: 0x1D        (GS)
Byte 1: 0x76        ('v')
Byte 2: 0x30        ('0')
Byte 3: quality      (0-3, typically 0)
Byte 4: width_lo     (bytesPerRow % 256)
Byte 5: width_hi     (bytesPerRow / 256)
Byte 6: height_lo    (height % 256)
Byte 7: height_hi    (height / 256)
[data]: raw 1bpp bitmap, bytesPerRow * height bytes
```

Where `bytesPerRow = ceil(pixelWidth / 8)`.

#### P15 Full Print Sequence (L11 path: `p112Print`)

```
1. [Optional, P15-specific] Set density:  1F 70 02 <density>
2. Wakeup:        00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
3. Enable:        10 FF F1 02
4. Bitmap:        1D 76 30 00 <wl> <wh> <hl> <hh> <raw pixel data>
5. Feed/Position: 1B 4A 64   (feed 100 dots)  — OR —  1D 0C (position to gap)
6. Stop:          10 FF F1 45
```

### 3.3 CommandPort Compressed Protocol (P50, P80, S2)

Used by P50-class printers. Uses compressed image data and a different command set.

#### Command Reference

| Command | Bytes (hex) | Description |
|---------|------------|-------------|
| Start print job | `1F C0 01 00` | Begin print session |
| Stop print job | `1F C0 01 01` | End print session |
| Wakeup (ESC) | `00 00 00 00 00 00` | 6 zero bytes |
| Print bitmap (compressed) | `1F 10 WH WL HH HL L3 L2 L1 L0` + data | See below |
| Set density | `1F 70 DD VV` | DD = param, VV = value |
| Set speed | `1F 60 SS VV` | SS = param, VV = value |
| Adjust position (auto) | `1F 11 PP` | PP: 0x51=start, 0x50=end |
| Adjust position (manual) | `1F 11 PP HH LL` | PP=param, HH:LL=value |
| Printer location | `1F 12 XX YY` | Position command |
| Location auto | `0C` | Feed to next label |
| Into boot mode | `1F A0 BE 66 88` | Enter bootloader |
| Firmware sending | `10 FF A0 04 ...` | OTA header |
| Send complete | `10 FF A0 06` | OTA complete |
| Set BT type | `1F B2 00` | BT configuration |

#### Print Bitmap Header (Compressed path)

```
Byte 0: 0x1F
Byte 1: 0x10
Byte 2: width_hi     (bytesPerRow / 256)
Byte 3: width_lo     (bytesPerRow % 256)
Byte 4: height_hi    (height / 256)
Byte 5: height_lo    (height % 256)
Byte 6: length >> 24  (compressed data length, big-endian)
Byte 7: length >> 16
Byte 8: length >> 8
Byte 9: length & 0xFF
[data]: compressed bitmap (DFunction.code() or YxqZLib.code())
```

Note: The compressed path uses `doPrint()` before sending to signal the flow control system.

#### P50 Full Print Sequence

```
1. Set density:      1F 70 02 <density>
2. Start print job:  1F C0 01 00
3. [first label] Adjust position auto: 1F 11 51
4. Print bitmap:     1F 10 <wh> <wl> <hh> <hl> <len4> <compressed data>
5. Location:         1F 12 20 00
6. Stop print job:   1F C0 01 01
7. [last label] Adjust position auto: 1F 11 50
```

### 3.4 S8 SPP Protocol

Uses Bluetooth SPP (Serial Port Profile) instead of BLE GATT. Implemented in `PrinterCommandS8` and `PrinterPortWithSpp`.

Key differences from BLE protocols:
- Connection via RFCOMM socket, not GATT
- Different density scale: 1→1, 2→4, 3→8
- Paper types: 16, 48, 64

### 3.5 TSPL Text Protocol

Text-based label printer protocol. Commands are ASCII strings terminated with `\r\n`, encoded as GB2312.

```
SIZE 40 mm, 30 mm\r\n
DENSITY 8\r\n
SPEED 4\r\n
DIRECTION 1,0\r\n
CLS\r\n
BITMAP x,y,widthBytes,height,3,<encoded_data>\r\n
TEXT x,y,"font",rotation,xmul,ymul,"content"\r\n
BARCODE x,y,"type",height,readable,rotation,narrow,wide,"content"\r\n
QRCODE x,y,"L",cellWidth,mode,model,"content"\r\n
PRINT 1\r\n
SET CUTTER 1\r\n
SET GAP ON\r\n
```

Used by some printer models for more complex label layouts. The P15 does **not** use TSPL for standard bitmap printing.

---

## 4. Image Encoding

### 4.1 Grayscale and Thresholding

Two grayscale methods are used:

**Method A (L11 — PrintL11.printBitmap1):** Weighted luminance
```
gray = (R * 0.299) + (G * 0.587) + (B * 0.114)
black = gray < 128
```

**Method B (CommandPort — imageProcess):** Simple average
```
gray = (R + G + B) / 3
black = gray < 126
```

### 4.2 Floyd-Steinberg Dithering

Implemented in `PrintAlgorithmTools.serpentineDither()`. Serpentine (bidirectional) variant for reduced banding.

**Error distribution matrix:**
```
            pixel   7/16 →
    3/16 ↙  5/16 ↓  1/16 ↘
```

**Algorithm:**
```
For each row (alternating L→R and R→L):
  For each pixel:
    oldPixel = grayscale[x][y]
    newPixel = oldPixel >= 128 ? 255 : 0
    error = oldPixel - newPixel

    // Distribute error to neighbors:
    neighbor_forward      += error * 7/16
    neighbor_below_back   += error * 3/16
    neighbor_below        += error * 5/16
    neighbor_below_forward += error * 1/16

    // Clamp all values to [0, 255]
```

Even rows process left-to-right; odd rows process right-to-left (serpentine).

### 4.3 Bit-Packing

After thresholding or dithering, pixels are packed into bytes:

```
bytesPerRow = ceil(width / 8)
totalBytes = bytesPerRow * height

For each row:
  For each group of 8 pixels:
    byte = 0
    For bit 0..7:
      if pixel is black:
        byte |= (0x80 >> bit)    // MSB first
    output[rowOffset + byteIndex] = byte
```

- 1 = black (ink), 0 = white (no ink)
- MSB first: leftmost pixel is bit 7
- Rows padded to byte boundary

### 4.4 Compression

Two compression methods are available, selected by `GlobalDeviceContextProxy.getZLibCompressVersion()`:

**DFunction.code() — Native encoding (default):**
```java
// Native library: libDFunction.so
byte[] encoded = DFunction.code(rawBitmapBytes);
```
- Custom proprietary encoding (implementation in native code, not visible in Java)
- Used by most protocols

**YxqZLib.code() — Zlib compression (version 1):**
```java
byte[] compressed = YxqZLib.code(rawBitmapBytes, 14, 16384, 6);
// param1 = 14    → windowBits (2^14 = 16KB sliding window)
// param2 = 16384 → buffer size
// param3 = 6     → compression level (zlib default)
```
- Standard zlib/deflate compression
- Equivalent to: `deflateInit2(&stream, 6, Z_DEFLATED, 14, memLevel, Z_DEFAULT_STRATEGY)`

---

## 5. Device → Protocol Mapping

### Complete Device Table

| Device prefix | Protocol | Print method | Connection | Notes |
|--------------|----------|-------------|------------|-------|
| **P15**, P15R, P15S | L11 Binary (#11) | `p112Print` | BLE | Sets density with `1F 70 02 DD` |
| **P12** | L11 Binary (#11) | `p112Print` | BLE | |
| P11 | L11 Binary (#11) | `p112Print` | BLE | |
| **P7**, P7R | L11 Binary (#11) | `p112Print` | BLE | Mapped to P15 series |
| LP90 | L11 Binary (#11) | `p112Print` | BLE | |
| LP15 | L11 Binary (#11) | `p112Print` | BLE | |
| M1 | L11 Binary (#11) | `p112Print` | BLE | |
| S15, S12 | L11 Binary (#11) | `p112Print` | BLE | |
| P1s | L11 Binary (#11) | `p112Print` | BLE | |
| LPC74 | L11 Binary (#11) | `p112Print` | BLE | |
| P50, P50S | Compressed (#3) | `p50Print` | BLE | Adjust position auto 81/80 |
| D50 | Compressed (#3) | `p50Print` | BLE | |
| ewtto ET | Compressed (#3) | `p50Print` | BLE | |
| P80 | Compressed (#3) | `p80Print` | BLE | Uses alt service UUID |
| T3 | Compressed (#3) | `p80Print` | BLE | |
| S2 | Compressed (#2) | `printS2` | BLE | Deprecated protocol |
| LuckP_D1 | Mixed | `printLuckPD1` | BLE | Uses P850 commands |
| S8 | S8 SPP (#1) | `printS8` | SPP | Different density scale |
| D210, 210 | S8 SPP (#5) | `printS8` | SPP | |
| IP_D80, DP_D80, DP_8028 | S8 SPP (#1) | `printS8` | SPP | |
| HM-24-28, A31, U210, A50 | S8 SPP (#1) | `printS8` | SPP | |
| D100, X4, L100, D200 | External (#7) | CAPrintCommon | Proprietary | External library |
| X2, M60 | X2 BLE (#8/#9) | Custom | BLE | 1ms timer interval |
| L50, L80 | Legacy | `print()` | BLE | Older interface |

### Density Mapping by Protocol

| Protocol | Density 1 (light) | Density 2 (medium) | Density 3 (dark) |
|----------|-------------------|--------------------|--------------------|
| L11 / Compressed | 1 | 2 | 3 |
| S8 SPP | 1 | 4 | 8 |
| D210 | 11 | 13 | 15 |
| D100/X4 (CAPrint) | 1 | 7 | 15 |

### Connection Type Selection

```
Protocol 1, 5, 10 → Bluetooth SPP (RFCOMM socket)
Protocol 2, 3, 4, 6, 8, 11 → BLE GATT (CommandPort)
Protocol 7 → CAPrinterConnector (external library)
Protocol 9 → DataProcessor
```

---

## 6. Obfuscated Constants Reference

The decompiled code references constants from obfuscated library classes. Here's the complete mapping:

### com.google.common.base.a (Guava Ascii)

| Constant | Hex | Decimal | ASCII |
|----------|-----|---------|-------|
| `a.f61629a` | `0x00` | 0 | NUL |
| `a.f61630b` | `0x01` | 1 | SOH |
| `a.f61631c` | `0x02` | 2 | STX |
| `a.f61632d` | `0x03` | 3 | ETX |
| `a.f61633e` | `0x04` | 4 | EOT |
| `a.f61634f` | `0x05` | 5 | ENQ |
| `a.f61635g` | `0x06` | 6 | ACK |
| `a.f61636h` | `0x07` | 7 | BEL |
| `a.f61637i` | `0x08` | 8 | BS |
| `a.f61638j` | `0x09` | 9 | HT |
| `a.f61639k` | `0x0A` | 10 | LF |
| `a.f61642n` | `0x0C` | 12 | FF |
| `a.f61643o` | `0x0D` | 13 | CR |
| `a.f61646r` | `0x10` | 16 | DLE |
| `a.f61649u` | `0x12` | 18 | DC2 |
| `a.f61650v` | `0x13` | 19 | DC3 |
| `a.A` | `0x17` | 23 | ETB |
| `a.B` | `0x18` | 24 | CAN |
| `a.C` | `0x19` | 25 | EM |
| **`a.D`** | **`0x1A`** | **26** | **SUB** |
| **`a.E`** | **`0x1B`** | **27** | **ESC** |
| **`a.F`** | **`0x1C`** | **28** | **FS** |
| **`a.G`** | **`0x1D`** | **29** | **GS** |
| `a.H` | `0x1E` | 30 | RS |
| **`a.I`** | **`0x1F`** | **31** | **US** |
| `a.J` / `a.K` | `0x20` | 32 | SP |
| `a.L` | `0x7F` | 127 | DEL |

### Other Library Constants

| Reference | Hex | Decimal | Source |
|-----------|-----|---------|--------|
| `r.f70160e` | `0x30` | 48 | iTextPDF (`'0'`) |
| `SignedBytes.f63865a` | `0x40` | 64 | Guava (`'@'`) |
| `f.f49576e` | `0xA0` | -96 (signed) / 160 | bluetrum FOTA |

### Frequently Used Command Byte Patterns (Decoded)

| Code pattern | Decoded hex | Typical usage |
|-------------|------------|---------------|
| `{16, -1, ...}` | `10 FF ...` | Printer control commands |
| `{a.I, ...}` | `1F ...` | Print parameters (density, speed, paper) |
| `{a.G, 118, r.f70160e, ...}` | `1D 76 30 ...` | GS v 0 — print raster bitmap |
| `{a.E, 74, n}` | `1B 4A n` | ESC J — feed n dots |
| `{a.E, 100, n}` | `1B 64 n` | ESC d — feed n lines |
| `{a.D, a.I, ...}` | `1A 1F ...` | Encryption/UID commands |

---

## 7. Key Source Files

### Core SDK (`com/yxqapp/sdk/`)

| File | Purpose |
|------|---------|
| `BluetoothPort.java` | BLE GATT connection, flow control, data transmission |
| `CommandPort.java` | Command routing, compressed bitmap encoding, ESC commands |
| `PrinterPort.java` | Public API facade (singleton), delegates to L11/ESC/TSPL |
| `PrintL11.java` | L11 binary protocol commands (P15, P12, P11) |
| `Printer_ESC.java` | ESC/POS command generation (feed, text, barcode, QR) |
| `Printer_TSPL.java` | TSPL text protocol commands |
| `PrinterCommandS8.java` | S8 SPP protocol wrapper |
| `PrintS8.java` | S8 bitmap encoding |
| `PrinterPortWithSpp.java` | SPP Bluetooth transport |
| `ProtocolUtils.java` | Checksum (sum, XOR), hex conversion, frame parsing |
| `MyBluetoothGattCallback.java` | GATT callback handler |
| `HeartBeatContext.java` | Connection keepalive tracking |

### App Logic (`com/feioou/deliprint/yxq/`)

| File | Purpose |
|------|---------|
| `device/DeviceManager.java` | Device-specific print routing (p112Print, p50Print, etc.) |
| `factory/DeviceProtocolFactory.java` | Protocol selection by device model |
| `factory/protocol/*.java` | Protocol implementations (R15Protocol, P50VIOSProtocol, etc.) |
| `customized/devices/YXQCustomizedDevices.java` | Device name filtering and categorization |
| `factory/DeviceConstant.java` | Device name constants |
| `context/connect/DeviceConnectContext.java` | BLE scanning and device discovery |
| `utils/PrintAlgorithmTools.java` | Floyd-Steinberg dithering |
| `tools/YXQProtocolTools.java` | Device status parsing |
| `tools/BytesTools.java` | Byte array utilities |
| `context/proxy/GlobalDeviceContextImpl.java` | Device config (flow control, delays, compression) |
| `global/device/GlobalDeviceContextProxy.java` | Device config proxy (compression version, packet delay) |

### Native Libraries

| File | Purpose |
|------|---------|
| `com/btapplication/sdk/DFunction.java` | JNI wrapper for `libDFunction.so` (proprietary encoding) |
| `com/yxqapp/ynative/YxqZLib.java` | JNI wrapper for `libyxqzlib.so` (zlib compression) |

### Checksums and Framing (`ProtocolUtils.java`)

**Sum checksum:** `sum(bytes) & 0xFF`
**XOR checksum:** `xor(bytes)`
**Frame format (Code69):**
```
Header: 1A 1F 05  (or 1A 1F 08)
Payload: variable length
Checksum: sum(payload) & 0xFF
```
