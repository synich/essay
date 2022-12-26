-- blog.cgi/read?dt=220204
local function read(q)
  local dt = q["dt"]
  local fname = popen(format("find ../pub | grep $", dt))
  local fd = io.open(fname, "r")
  if fd then
    local txt = fd:read("*a")
    print(txt)
  end
end

local function keyword(q)
  local kwd = b64dec(q["kwd"])
  local arr = str_split(kwd, " ")
  local cmd = format("select date, substr(content, 1, 50) from blog where content like '%$%' ", "$", arr[1])
  local i = 2
  if i <= #arr then
    cmd = cmd .. format("and content like '%$%' ", "$", arr[i])
    i = i + 1
  end
  cmd = cmd ..";"
  local ans = sql_exec("../pub/shuw", cmd)
  print(ans)
end

local function edit(q, c)
  local dt = q["dt"]
  local belong = dt:sub(1,1)
  local ctx = b64dec(c["ctx"])
  local fd = io.open("../pub/b"..belong.."/"..dt..".md", "w")
  fd:write(ctx)
  fd:close()
  os.execute(format("echo $ >>../pub/blog_up", "$", dt))
  print("len:"..#ctx)
end

local function title(q)
  local p = tonumber(q["page"])
  local s,e = p*50+1, p*50+50
  local cmd = "cat ../pub/blog_title | sed -ne '"..tostring(s)..","..tostring(e).."p'"
  os.execute(cmd)
end

fn["read"]=read
fn["keyword"]=keyword
fn["edit"]=edit
fn["title"]=title
fn["nedit"]=nedit
--read({dt="220115"})

local function nedit(q, c)
  local dt = q["dt"]
  local txt = c["txt"]
  local sql = format("INSERT OR REPLACE INTO blog VALUES($, '$', '$')", "$", dt, txt, "lang")
  print(sql_exec("shuw", sql))
end

