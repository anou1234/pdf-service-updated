import get from "lodash/get";
import logger from "../config/logger";
import axios from "axios";
import https from 'https';
import fs from 'fs';
import envVariables from "../EnvironmentVariables";
import {
  getLocalisationkey,
  findLocalisation,
  getDateInRequiredFormat,
  getValue
} from "./commons";

var jp = require("jsonpath");

let externalHost = envVariables.EGOV_EXTERNAL_HOST;

// Respect NODE_EXTRA_CA_CERTS or custom CA_CERT_PATH; fall back to default trust store
const caPath = process.env.NODE_EXTRA_CA_CERTS || envVariables.CA_CERT_PATH;
let httpsAgent;
try {
  if (caPath && fs.existsSync(caPath)) {
    httpsAgent = new https.Agent({ ca: fs.readFileSync(caPath) });
    logger.info(`Using custom CA bundle at: ${caPath}`);
  } else {
    httpsAgent = new https.Agent();
  }
} catch (e) {
  logger.warn(`Failed to load CA bundle from ${caPath || "<unset>"}: ${e.message}. Falling back to default trust store.`);
  httpsAgent = new https.Agent();
}

const axios_instance = axios.create({ httpsAgent });

// Determine if a hostname looks like an internal Docker/k8s service name
const isInternalHost = (host) => {
  if (!host) return false;
  const lower = host.toLowerCase();
  const isIPv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(lower);
  const isIPv6 = /^[0-9a-f:]+$/.test(lower) && lower.includes(":");
  if (lower === "localhost" || isIPv4 || isIPv6) return false;
  if (lower === "egov-localization" || lower === "egov-filestore") return true;
  if (lower.endsWith(".egov")) return true;
  const hasDot = lower.includes(".");
  if (!hasDot) return true;
  return false;
};

function rewriteInternalUrlIfNeeded(rawUrl) {
  try {
    if (!envVariables.REWRITE_INTERNAL_HOSTS) return rawUrl;
    if (/^https?:\/\//i.test(rawUrl)) {
      const u = new URL(rawUrl);
      if (isInternalHost(u.hostname)) {
        const base = new URL(envVariables.EGOV_HOST);
        u.protocol = base.protocol;
        u.host = base.host;
        u.port = ""; // drop any :8080
        return u.toString();
      }
      return rawUrl;
    }
    if (rawUrl.startsWith("/")) {
      const base = new URL(envVariables.EGOV_HOST);
      return new URL(rawUrl, base).toString();
    }
    const firstSlash = rawUrl.indexOf("/");
    if (firstSlash > 0) {
      const maybeHost = rawUrl.substring(0, firstSlash);
      const rest = rawUrl.substring(firstSlash);
      if (isInternalHost(maybeHost)) {
        const base = new URL(envVariables.EGOV_HOST);
        return new URL(rest, base).toString();
      }
    }
    return rawUrl;
  } catch (e) {
    logger.warn(`URL rewrite skipped for ${rawUrl}: ${e.message}`);
    return rawUrl;
  }
}
/**
 *
 * @param {*} req - current module object, picked from request body
 * @param {*} dataconfig  - data config
 * @param {*} variableTovalueMap - map used for filling values by template engine 'mustache'
 * @param {*} localisationMap - Map to store localisation key, value pair
 * @param {*} requestInfo - request info from request body
 */

function escapeRegex(string) {
  if (typeof string == "string")
    return string.replace(/[\\"]/g, '\\$&');
  else
    return string;
}

export const directMapping = async (
  req,
  dataconfig,
  variableTovalueMap,
  requestInfo,
  unregisteredLocalisationCodes,
  pdfKey
) => {
  var directArr = [];
  var localisationCodes = [];
  var localisationModules = [];
  var variableToModuleMap = {};
  // using jp-jsonpath because loadash can not handele '*'
  var objectOfDirectMapping = jp.query(
    dataconfig,
    "$.DataConfigs.mappings.*.mappings.*.direct.*"
  );
  objectOfDirectMapping = getValue(
    objectOfDirectMapping,
    [],
    "$.DataConfigs.mappings.*.mappings.*.direct.*"
  );
  directArr = objectOfDirectMapping.map(item => {
    return {
      jPath: item.variable,
      val:
        item.value &&
        getValue(jp.query(req, item.value.path), "NA", item.value.path),
      valJsonPath: item.value && item.value.path,
      type: item.type,
      url: item.url,
      format: item.format,
      localisation: item.localisation,
      uCaseNeeded: item.isUpperCaseRequired
    };
  });

  for (var i = 0; i < directArr.length; i++) {
    //for array type direct mapping
    if (directArr[i].type == "citizen-employee-title") {
      if (get(requestInfo, "userInfo.type", "NA").toUpperCase() == "EMPLOYEE") {
        variableTovalueMap[directArr[i].jPath] = "Employee Copy";
      } else {
        variableTovalueMap[directArr[i].jPath] = "Citizen Copy";
      }
    }
    if (directArr[i].type == "selectFromRequestInfo") {
      directArr[i].val = getValue(
        jp.query(requestInfo, directArr[i].valJsonPath),
        "NA",
        directArr[i].valJsonPath
      );

      if (typeof directArr[i].val == "object" && directArr[i].val.length > 0)
        directArr[i].val = directArr[i].val[0];

      variableTovalueMap[directArr[i].jPath] = directArr[i].val;
    }
    else if (directArr[i].type == "external_host") {
      variableTovalueMap[directArr[i].jPath] = externalHost;
    }
    else if (directArr[i].type == "function") {
      var fun = Function("type", directArr[i].format);
      const arg = Array.isArray(directArr[i].val)
        ? directArr[i].val.length > 0 ? directArr[i].val[0] : undefined
        : directArr[i].val;
      try {
        if (arg === undefined || arg === null || arg === "NA") {
          variableTovalueMap[directArr[i].jPath] = "NA";
        } else {
          variableTovalueMap[directArr[i].jPath] = fun(arg);
        }
      } catch (e) {
        logger.error(e.stack || e);
        variableTovalueMap[directArr[i].jPath] = "NA";
      }
    } else if (directArr[i].type == "image") {
      try {
        const imgUrl = rewriteInternalUrlIfNeeded(directArr[i].url);
        var response = await axios_instance.get(imgUrl, {
          responseType: "arraybuffer"
        });
        variableTovalueMap[directArr[i].jPath] =
          "data:" +
          response.headers["content-type"] +
          ";base64," +
          Buffer.from(response.data).toString("base64");
        //  logger.info("loaded image: "+directArr[i].url);
      } catch (error) {
        logger.error(error.stack || error);
        throw {
          message: `error while loading image from: ${directArr[i].url}`
        };
      }
    } else if (directArr[i].type == "array") {
      let arrayOfOwnerObject = [];
      // let ownerObject = JSON.parse(JSON.stringify(get(formatconfig, directArr[i].jPath + "[0]", [])));

      let { format = {}, val = [], variable } = directArr[i];
      let { scema = [] } = format;

      //taking values about owner from request body
      for (let j = 0; j < val.length; j++) {
        // var x = 1;
        let ownerObject = {};
        for (let k = 0; k < scema.length; k++) {
          let fieldValue = get(val[j], scema[k].value, "NA");
          fieldValue = fieldValue == null ? "NA" : fieldValue;
          if (scema[k].type == "date") {
            let myDate = new Date(fieldValue);
            if (isNaN(myDate) || fieldValue === 0) {
              ownerObject[scema[k].variable] = "NA";
            } else {
              let replaceValue = getDateInRequiredFormat(fieldValue, scema[k].format);
              // set(formatconfig,externalAPIArray[i].jPath[j].variable,replaceValue);
              ownerObject[scema[k].variable] = replaceValue;
            }
          } else {
            if (
              fieldValue !== "NA" &&
              scema[k].localisation &&
              scema[k].localisation.required
            ) {
              let loc = scema[k].localisation;
              fieldValue = await getLocalisationkey(
                loc.prefix,
                fieldValue,
                loc.isCategoryRequired,
                loc.isMainTypeRequired,
                loc.isSubTypeRequired,
                loc.delimiter
              );
              if (!localisationCodes.includes(fieldValue))
                localisationCodes.push(fieldValue);

              if (!localisationModules.includes(loc.module))
                localisationModules.push(loc.module);

              variableToModuleMap[scema[k].variable] = loc.module;
            }
            let currentValue = fieldValue;
            if (typeof currentValue == "object" && currentValue.length > 0)
              currentValue = currentValue[0];

            currentValue = escapeRegex(currentValue);
            ownerObject[scema[k].variable] = currentValue;
          }
          // set(ownerObject[x], "text", get(val[j], scema[k].key, ""));
          // x += 2;
        }
        arrayOfOwnerObject.push(ownerObject);
      }
      // set(formatconfig, directArr[i].jPath, arrayOfOwnerObject);
      variableTovalueMap[directArr[i].jPath] = arrayOfOwnerObject;
    }

    //setting value in pdf for array-column type direct mapping
    else if (directArr[i].type == "array-column") {
      let arrayOfBuiltUpDetails = [];
      let isOrderedList = false;
      // let arrayOfFields=get(formatconfig, directArr[i].jPath+"[0]",[]);
      // arrayOfBuiltUpDetails.push(arrayOfFields);

      let { format = {}, val = [], variable } = directArr[i];
      let { scema = [] } = format;
      //to get data of multiple floor Built up details
      for (let j = 0; j < val.length; j++) {
        let arrayOfItems = [];
        for (let k = 0; k < scema.length; k++) {
          let fieldValue = get(val[j], scema[k].value, "NA");
          fieldValue = fieldValue == null ? "NA" : fieldValue;
          if (scema[k].type == "date") {
            let myDate = new Date(fieldValue);
            if (isNaN(myDate) || fieldValue === 0) {
              arrayOfItems.push("NA");
            } else {
              let replaceValue = getDateInRequiredFormat(fieldValue, scema[k].format);
              // set(formatconfig,externalAPIArray[i].jPath[j].variable,replaceValue);
              arrayOfItems.push(replaceValue);
            }
          }
          /**
           * This condition is for displaying the ordered list data 
           * when data is coming as array of strings instead of key value pair.
           * Provided new scema type (array-orderedlist) which we should mention at data-config
           * to display the array of string in order list.
           */
          else if (scema[k].type == "array-orderedlist" && Array.isArray(fieldValue)) {
            if (fieldValue !== "NA") {
              for (var p = 0; p < fieldValue.length; p++) {
                let orderedList = [];
                orderedList.push(fieldValue[p]);
                arrayOfBuiltUpDetails.push(orderedList);
              }
              isOrderedList = true;
            }
          } else {
            if (
              fieldValue !== "NA" &&
              scema[k].localisation &&
              scema[k].localisation.required
            ) {
              let loc = scema[k].localisation;
              fieldValue = await getLocalisationkey(
                loc.prefix,
                fieldValue,
                loc.isCategoryRequired,
                loc.isMainTypeRequired,
                loc.isSubTypeRequired,
                loc.delimiter
              );
              if (!localisationCodes.includes(fieldValue))
                localisationCodes.push(fieldValue);

              if (!localisationModules.includes(loc.module))
                localisationModules.push(loc.module);
            }
            arrayOfItems.push(fieldValue);
          }
        }
        if (isOrderedList === false)
          arrayOfBuiltUpDetails.push(arrayOfItems);
      }

      // remove enclosing [ &  ]
      let stringBuildpDetails = JSON.stringify(arrayOfBuiltUpDetails).replace(
        "[",
        ""
      );
      stringBuildpDetails = stringBuildpDetails.substring(
        0,
        stringBuildpDetails.length - 1
      );

      variableTovalueMap[directArr[i].jPath] = stringBuildpDetails;
      // set(formatconfig,directArr[i].jPath,arrayOfBuiltUpDetails);
    }
    //setting value in pdf for no type direct mapping
    else if (directArr[i].type == "label") {
      let code = await getLocalisationkey(
        directArr[i].localisation.prefix,
        directArr[i].valJsonPath,
        directArr[i].localisation.isCategoryRequired,
        directArr[i].localisation.isMainTypeRequired,
        directArr[i].localisation.isSubTypeRequired,
        directArr[i].localisation.delimiter
      );
      if (!localisationCodes.includes(code))
        localisationCodes.push(code);

      if (!localisationModules.includes(directArr[i].localisation.module))
        localisationModules.push(directArr[i].localisation.module);

      variableTovalueMap[directArr[i].jPath] = code;
      variableToModuleMap[directArr[i].jPath] = directArr[i].localisation.module;

    }

    else if (directArr[i].type == "date") {
      const rawVal = Array.isArray(directArr[i].val)
        ? (directArr[i].val.length > 0 ? directArr[i].val[0] : undefined)
        : directArr[i].val;
      if (rawVal === undefined || rawVal === null || rawVal === "NA") {
        variableTovalueMap[directArr[i].jPath] = "NA";
      } else {
        let myDate = new Date(rawVal);
        if (isNaN(myDate) || rawVal === 0) {
          variableTovalueMap[directArr[i].jPath] = "NA";
        } else {
          let replaceValue = getDateInRequiredFormat(rawVal, directArr[i].format);
          variableTovalueMap[directArr[i].jPath] = replaceValue;
        }
      }
    }

    else {
      directArr[i].val = getValue(
        directArr[i].val,
        "NA",
        directArr[i].valJsonPath
      );
      if (
        directArr[i].val !== "NA" &&
        directArr[i].localisation &&
        directArr[i].localisation.required
      ) {

        let code = await getLocalisationkey(
          directArr[i].localisation.prefix,
          directArr[i].val,
          directArr[i].localisation.isCategoryRequired,
          directArr[i].localisation.isMainTypeRequired,
          directArr[i].localisation.isSubTypeRequired,
          directArr[i].localisation.delimiter
        );

        if (Array.isArray(code)) {
          code = code.length > 0 ? code[0] : "NA";
        }

        if (!localisationCodes.includes(code))
          localisationCodes.push(code);

        if (!localisationModules.includes(directArr[i].localisation.module))
          localisationModules.push(directArr[i].localisation.module);

        variableTovalueMap[directArr[i].jPath] = code;

        variableToModuleMap[directArr[i].jPath] = directArr[i].localisation.module;

      }

      else {
        let currentValue = directArr[i].val;
        if (typeof currentValue == "object" && currentValue.length > 0)
          currentValue = currentValue[0];

        // currentValue=currentValue.replace(/\\/g,"\\\\").replace(/"/g,'\\"');
        currentValue = escapeRegex(currentValue);
        variableTovalueMap[directArr[i].jPath] = currentValue;
      }
      if (directArr[i].uCaseNeeded) {
        let currentValue = variableTovalueMap[directArr[i].jPath];
        if (Array.isArray(currentValue) && currentValue.length > 0) {
          currentValue = currentValue[0];
        }
        if (typeof currentValue === 'string' && currentValue.toUpperCase) {
          variableTovalueMap[directArr[i].jPath] = currentValue.toUpperCase();
        } else {
          // leave as-is if not a string
          variableTovalueMap[directArr[i].jPath] = currentValue;
        }
      }
    }
  }

  let localisationMap = [];
  try {
    let resposnseMap = await findLocalisation(
      requestInfo,
      localisationModules,
      localisationCodes,
      pdfKey + '-directMapping'
    );

    resposnseMap.messages.map((item) => {
      localisationMap[item.code + "_" + item.module] = item.message;
    });
  }
  catch (error) {
    logger.error(error.stack || error);
    const msg = (error && error.Errors && Array.isArray(error.Errors) && error.Errors[0] && error.Errors[0].message)
      || error.message
      || "Unknown localisation error";
    throw {
      message: `Error in localisation service call: ${msg}`
    };
  }




  Object.keys(variableTovalueMap).forEach(function (key) {
    if (variableToModuleMap[key] && typeof variableTovalueMap[key] == 'string') {
      var code = variableTovalueMap[key];
      var module = variableToModuleMap[key];
      if (localisationMap[code + "_" + module]) {
        variableTovalueMap[key] = localisationMap[code + "_" + module];
        if (unregisteredLocalisationCodes.includes(code)) {
          var index = unregisteredLocalisationCodes.indexOf(code);
          unregisteredLocalisationCodes.splice(index, 1);
        }
      }
      else {
        if (!unregisteredLocalisationCodes.includes(code))
          unregisteredLocalisationCodes.push(code);
      }
    }

    if (typeof variableTovalueMap[key] == 'object') {
      Object.keys(variableTovalueMap[key]).forEach(function (objectKey) {
        Object.keys(variableTovalueMap[key][objectKey]).forEach(function (objectItemkey) {
          if (variableToModuleMap[objectItemkey]) {
            var module = variableToModuleMap[objectItemkey];
            var code = variableTovalueMap[key][objectKey][objectItemkey];
            if (localisationMap[code + "_" + module]) {
              variableTovalueMap[key][objectKey][objectItemkey] = localisationMap[code + "_" + module];
              if (unregisteredLocalisationCodes.includes(code)) {
                var index = unregisteredLocalisationCodes.indexOf(code);
                unregisteredLocalisationCodes.splice(index, 1);
              }
            }
            else {
              if (!unregisteredLocalisationCodes.includes(code))
                unregisteredLocalisationCodes.push(code);
            }
          }
        });
      });
    }

  });

};
