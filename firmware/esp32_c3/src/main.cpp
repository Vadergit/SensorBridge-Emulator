#include <Arduino.h>
#include <NimBLEDevice.h>
#include <cstdlib>\n#include <cstring>\n#include <cmath>

// EXPERIMENTAL BLE TRANSPORT ONLY.
// No GPIO driving the bridge, no AD5270 SPI writes, no analogue output enabling.
// Do not use for controlling attached sensor signal conditioners.

constexpr char DEVICE_NAME[] = "SensorBridge-C3";
constexpr char SERVICE_UUID[] = "eaa10000-29f1-4a63-9d72-fd49d8b6c100";
constexpr char COMMAND_UUID[] = "eaa10001-29f1-4a63-9d72-fd49d8b6c100";
constexpr char STATUS_UUID[] = "eaa10002-29f1-4a63-9d72-fd49d8b6c100";

// Default simulation parameters in documented order.
double profile[12] = {5.0, 2.0, 0.0, 50.0, 25.0, 0.0, 0.0, 0.0, 0.0, 0.0, 10000.0, 4000.0};
NimBLECharacteristic* statusCharacteristic = nullptr;
const char keys[] = "0123456789ab";

void publishStatus() {
  if(!statusCharacteristic) return;
  // Always explicitly announces analogue outputs disabled.
  statusCharacteristic->setValue("{\"v\":1,\"status\":\"demo\",\"analogueEnabled\":false}");
}

class CommandCallbacks final : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* characteristic, NimBLEConnInfo& connInfo) override {
    const std::string message = characteristic->getValue();
    // Compact ASCII command: "<key>=<number>", e.g. "3=50".
    if(message.size()<3 || message[1]!='=' || message.size()>20) return;
    const char* matched = strchr(keys, message[0]);
    if(!matched) return;
    const int index = static_cast<int>(matched-keys);
    const char* number = message.c_str()+2;
    char* tail = nullptr;
    const double value = strtod(number, &tail);
    if(tail==number || !tail || *tail!='\\0' || !std::isfinite(value)) return;
    // Bounds check each physical parameter.
    const double minValues[] = {0.1,1,-1000,0,-40,-5000,-50000,-20,-100000,0,100,-10000};
    const double maxValues[] = {5.5,4,1000,100,125,5000,50000,20,100000,1,1e7,20000};
    if(value<minValues[index] || value>maxValues[index])return;
    profile[index] = value;
    Serial.printf("BLE config[%d] = %.3f (not applied to bridge)\n",index,value);
    publishStatus();
  }
};
CommandCallbacks callbacks;

void setup() {
  Serial.begin(115200);
  // Deliberately no bridge GPIO setup. All hardware output functions remain disabled.
  NimBLEDevice::init(DEVICE_NAME);
  NimBLEServer* server = NimBLEDevice::createServer();
  NimBLEService* service = server->createService(SERVICE_UUID);
  auto* command = service->createCharacteristic(COMMAND_UUID, NIMBLE_PROPERTY::WRITE);
  statusCharacteristic = service->createCharacteristic(STATUS_UUID, NIMBLE_PROPERTY::READ);
  command->setCallbacks(&callbacks);
  publishStatus();
  service->start();
  NimBLEAdvertising* advertising=NimBLEDevice::getAdvertising();
  advertising->addServiceUUID(SERVICE_UUID);
  advertising->start();
  Serial.println("SensorBridge-C3 BLE DEMO available; analogue stage DISABLED");
}
void loop() { delay(50); }
