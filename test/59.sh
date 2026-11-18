: "${TOLL_TEST_ADMIN_PASSWORD:?Set the local disposable test admin password}"
se2459 logout
se2459 login --username admin --passw "$TOLL_TEST_ADMIN_PASSWORD"
se2459 healthcheck
se2459 resetpasses
se2459 healthcheck
se2459 resetstations
se2459 healthcheck
se2459 admin --addpasses --source csv/passes59.csv
se2459 healthcheck
se2459 tollstationpasses --station AM08 --from 20220227 --to 20220312 --format json
se2459 tollstationpasses --station NAO04 --from 20220227 --to 20220312 --format csv
se2459 tollstationpasses --station NO01 --from 20220227 --to 20220312 --format csv
se2459 tollstationpasses --station OO03 --from 20220227 --to 20220312 --format csv
se2459 tollstationpasses --station XXX --from 20220227 --to 20220312 --format csv
se2459 tollstationpasses --station OO03 --from 20220227 --to 20220312 --format YYY
se2459 errorparam --station OO03 --from 20220227 --to 20220312 --format csv
se2459 tollstationpasses --station AM08 --from 20220228 --to 20220310 --format json
se2459 tollstationpasses --station NAO04 --from 20220228 --to 20220310 --format csv
se2459 tollstationpasses --station NO01 --from 20220228 --to 20220310 --format csv
se2459 tollstationpasses --station OO03 --from 20220228 --to 20220310 --format csv
se2459 tollstationpasses --station XXX --from 20220228 --to 20220310 --format csv
se2459 tollstationpasses --station OO03 --from 20220228 --to 20220310 --format YYY
se2459 passanalysis --stationop AM --tagop NAO --from 20220227 --to 20220312 --format json
se2459 passanalysis --stationop NAO --tagop AM --from 20220227 --to 20220312 --format csv
se2459 passanalysis --stationop NO --tagop OO --from 20220227 --to 20220312 --format csv
se2459 passanalysis --stationop OO --tagop KO --from 20220227 --to 20220312 --format csv
se2459 passanalysis --stationop XXX --tagop KO --from 20220227 --to 20220312 --format csv
se2459 passanalysis --stationop AM --tagop NAO --from 20220228 --to 20220310 --format json
se2459 passanalysis --stationop NAO --tagop AM --from 20220228 --to 20220310 --format csv
se2459 passanalysis --stationop NO --tagop OO --from 20220228 --to 20220310 --format csv
se2459 passanalysis --stationop OO --tagop KO --from 20220228 --to 20220310 --format csv
se2459 passanalysis --stationop XXX --tagop KO --from 20220228 --to 20220310 --format csv
se2459 passescost --stationop AM --tagop NAO --from 20220227 --to 20220312 --format json
se2459 passescost --stationop NAO --tagop AM --from 20220227 --to 20220312 --format csv
se2459 passescost --stationop NO --tagop OO --from 20220227 --to 20220312 --format csv
se2459 passescost --stationop OO --tagop KO --from 20220227 --to 20220312 --format csv
se2459 passescost --stationop XXX --tagop KO --from 20220227 --to 20220312 --format csv
se2459 passescost --stationop AM --tagop NAO --from 20220228 --to 20220310 --format json
se2459 passescost --stationop NAO --tagop AM --from 20220228 --to 20220310 --format csv
se2459 passescost --stationop NO --tagop OO --from 20220228 --to 20220310 --format csv
se2459 passescost --stationop OO --tagop KO --from 20220228 --to 20220310 --format csv
se2459 passescost --stationop XXX --tagop KO --from 20220228 --to 20220310 --format csv
se2459 chargesby --opid NAO --from 20220227 --to 20220312 --format json
se2459 chargesby --opid GE --from 20220227 --to 20220312 --format csv
se2459 chargesby --opid OO --from 20220227 --to 20220312 --format csv
se2459 chargesby --opid KO --from 20220227 --to 20220312 --format csv
se2459 chargesby --opid NO --from 20220227 --to 20220312 --format csv
se2459 chargesby --opid NAO --from 20220228 --to 20220310 --format json
se2459 chargesby --opid GE --from 20220228 --to 20220310 --format csv
se2459 chargesby --opid OO --from 20220228 --to 20220310 --format csv
se2459 chargesby --opid KO --from 20220228 --to 20220310 --format csv
se2459 chargesby --opid NO --from 20220228 --to 20220310 --format csv