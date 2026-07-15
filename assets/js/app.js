const STORAGE_KEY="olivePortalEmployeesV01";
let employees=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
let currentPhoto="";

const fieldIds=["employeeNo","name","kana","birthDate","postalCode","address","phone","email","emergencyName","emergencyPhone","location","position","employmentType","hireDate","contractEnd","wageType","baseWage","qualificationAllowance","improvementAllowance","transportAllowance","nightWage","healthInsurance","pension","employmentInsurance","healthCheckDate","nextHealthCheck","paidLeaveRemaining","dependents","dependentDeclaration","qualifications","qualificationDate","qualificationExpiry","notes"];

const $=id=>document.getElementById(id);
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(employees))}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

function showView(target){
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===target));
  document.querySelectorAll(".nav-button").forEach(b=>b.classList.toggle("active",b.dataset.target===target));
  renderAll(); window.scrollTo({top:0,behavior:"smooth"});
}

document.querySelectorAll("[data-target]").forEach(button=>button.addEventListener("click",()=>showView(button.dataset.target)));
["addEmployeeTop","addEmployeeMenu","addEmployeeList"].forEach(id=>$(id)?.addEventListener("click",()=>openForm()));

document.querySelectorAll(".tab").forEach(tab=>tab.addEventListener("click",()=>{
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t===tab));
  document.querySelectorAll(".tab-panel").forEach(p=>p.classList.toggle("active",p.dataset.panel===tab.dataset.tab));
}));

function openForm(id=""){
  $("employeeForm").reset(); $("employeeId").value=""; currentPhoto="";
  $("photoPreview").innerHTML="👤"; $("modalTitle").textContent=id?"職員情報編集":"職員登録";
  if(id){
    const employee=employees.find(e=>e.id===id); if(!employee)return;
    $("employeeId").value=id;
    fieldIds.forEach(key=>{if($(key))$(key).value=employee[key]??""});
    currentPhoto=employee.photo||"";
    if(currentPhoto)$("photoPreview").innerHTML=`<img src="${currentPhoto}" alt="顔写真">`;
  }
  document.querySelector(".tab[data-tab='basic']").click();
  $("employeeModal").classList.add("open"); $("employeeModal").setAttribute("aria-hidden","false");
}
function closeForm(){$("employeeModal").classList.remove("open");$("employeeModal").setAttribute("aria-hidden","true")}
$("closeModal").addEventListener("click",closeForm);$("cancelForm").addEventListener("click",closeForm);
$("employeeModal").addEventListener("click",e=>{if(e.target===$("employeeModal"))closeForm()});

$("photoInput").addEventListener("change",event=>{
  const file=event.target.files[0]; if(!file)return;
  if(file.size>2*1024*1024){alert("写真は2MB以下を推奨します。");return}
  const reader=new FileReader();
  reader.onload=e=>{currentPhoto=e.target.result;$("photoPreview").innerHTML=`<img src="${currentPhoto}" alt="顔写真">`};
  reader.readAsDataURL(file);
});

$("employeeForm").addEventListener("submit",event=>{
  event.preventDefault();
  const id=$("employeeId").value||crypto.randomUUID();
  const existing=employees.find(e=>e.id===id)||{};
  const employee={...existing,id,status:existing.status||"active",photo:currentPhoto,updatedAt:new Date().toISOString()};
  fieldIds.forEach(key=>employee[key]=$(key)?.value??"");
  const index=employees.findIndex(e=>e.id===id);
  if(index>=0)employees[index]=employee;else employees.push(employee);
  save();closeForm();showView("employeesView");
});

function employeeCard(employee,retired=false){
  const avatar=employee.photo?`<div class="avatar"><img src="${employee.photo}" alt="${escapeHtml(employee.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"></div>`:`<div class="avatar">${escapeHtml((employee.name||"職").slice(0,1))}</div>`;
  return `<article class="employee-card">
    ${avatar}
    <div class="employee-body">
      <h3>${escapeHtml(employee.name||"氏名未入力")}</h3>
      <p>${escapeHtml(employee.location||"所属未設定")} ／ ${escapeHtml(employee.position||"役職未設定")}<br>
      ${retired?`退職日 ${escapeHtml(employee.retirementDate||"未設定")}`:`入社日 ${escapeHtml(employee.hireDate||"未設定")}`}</p>
      <span class="badge${employee.employmentType==="パート"?" part":""}">${escapeHtml(employee.employmentType||"未設定")}</span>
    </div>
    <div class="card-actions">
      <button class="mini-button" onclick="openForm('${employee.id}')">詳細・編集</button>
      ${retired?`<button class="mini-button" onclick="restoreEmployee('${employee.id}')">在籍へ戻す</button>`:`<button class="mini-button danger" onclick="retireEmployee('${employee.id}')">退職処理</button>`}
    </div>
  </article>`;
}

function renderEmployees(){
  const query=$("searchInput").value.toLowerCase();
  const employment=$("employmentFilter").value;
  const list=employees.filter(e=>e.status!=="retired").filter(e=>{
    const text=[e.name,e.kana,e.location,e.position,e.qualifications].join(" ").toLowerCase();
    return text.includes(query)&&(!employment||e.employmentType===employment);
  });
  $("employeeList").innerHTML=list.length?list.map(e=>employeeCard(e)).join(""):`<div class="empty">該当する職員はいません。</div>`;
}
$("searchInput").addEventListener("input",renderEmployees);$("employmentFilter").addEventListener("change",renderEmployees);

window.retireEmployee=id=>{
  const employee=employees.find(e=>e.id===id);if(!employee)return;
  const date=prompt("退職日を入力してください。例 2026-07-31",new Date().toISOString().slice(0,10));if(date===null)return;
  employee.status="retired";employee.retirementDate=date;employee.retirementReason=prompt("退職理由を入力してください。","")||"";
  save();renderAll();
};
window.restoreEmployee=id=>{
  if(!confirm("在籍者へ戻しますか？"))return;
  const employee=employees.find(e=>e.id===id);employee.status="active";employee.retirementDate="";employee.retirementReason="";save();renderAll();
};
window.openForm=openForm;

function renderAll(){
  const active=employees.filter(e=>e.status!=="retired"), retired=employees.filter(e=>e.status==="retired");
  $("activeCount").textContent=`${active.length}名`;$("dashActive").textContent=active.length;$("dashRetired").textContent=retired.length;
  $("dashHealthMissing").textContent=active.filter(e=>!e.healthCheckDate).length;
  $("dashDependentMissing").textContent=active.filter(e=>e.dependentDeclaration!=="提出済").length;
  $("retiredList").innerHTML=retired.length?retired.map(e=>employeeCard(e,true)).join(""):`<div class="empty">退職者データはありません。</div>`;
  const alerts=[];
  active.forEach(e=>{if(!e.healthCheckDate)alerts.push(`${e.name||"氏名未入力"}：健康診断日が未登録です`);if(e.dependentDeclaration!=="提出済")alerts.push(`${e.name||"氏名未入力"}：扶養控除等申告書が未提出です`)});
  $("alertList").innerHTML=alerts.length?alerts.slice(0,20).map(a=>`<li>${escapeHtml(a)}</li>`).join(""):"<li>現在、確認事項はありません。</li>";
  renderEmployees();
}

if(!employees.length){
  employees=[{id:crypto.randomUUID(),status:"active",employeeNo:"EMP0001",name:"岩久保 博一",kana:"イワクボ ヒロカズ",location:"本社",position:"総務",employmentType:"正社員",hireDate:"2019-04-01",qualifications:"",healthCheckDate:"",dependentDeclaration:"提出済",notes:"サンプルデータ"}];
  save();
}
renderAll();
