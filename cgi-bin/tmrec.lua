-- tmrec.cgi/read?dt=2208
function read(q)
  local dt = q["dt"]
  local belong = dt:sub(1,1)
  local mon = dt:sub(1,4)
  local day = dt:sub(5,6)
  local cmd = "sed -n -e '"..day.."p' ../pub/t"..belong.."/"..mon..".txt"
  if day == '' then
    local cmd = "cat ../pub/t"..belong.."/"..mon..".txt"
  end
  os.execute(cmd)
end

function edit(q, c)
  local dt = q["dt"]
  local belong = dt:sub(1,1)
  local mon = dt:sub(1,4)
  local day = dt:sub(5,6)
  local txt = b64dec(c["txt"])
  local tm_name = format(" ../pub/t$/$.txt ", "$", belong, mon)
  local cmd = "sed -e '"..day.."c \\\n"..dt..txt.."'"..tm_name.." >tmp_tmrec"
  print(cmd)
  os.execute(cmd)
  os.execute("mv tmp_tmrec "..tm_name)
end

fn["read"]=read
fn["edit"]=edit
--read({dt="2209"})


